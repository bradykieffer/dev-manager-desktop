use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use crate::error::Error;

static CONFIG_FILE: OnceLock<PathBuf> = OnceLock::new();

pub fn init(config_dir: PathBuf) {
    let _ = CONFIG_FILE.set(config_dir.join("ssh-agent.json"));
}

pub fn configured_socket() -> Result<Option<String>, Error> {
    CONFIG_FILE
        .get()
        .map(|file| read_setting(file))
        .unwrap_or(Ok(None))
}

pub fn set_socket(socket: Option<String>) -> Result<(), Error> {
    write_setting(config_file()?, socket)
}

pub fn resolve_socket() -> Result<Option<String>, Error> {
    let configured = configured_socket()?;
    if configured.is_some() {
        return choose_socket(configured, None, None);
    }
    let environment = std::env::var("SSH_AUTH_SOCK")
        .map(Some)
        .or_else(|error| match error {
            std::env::VarError::NotPresent => Ok(None),
            _ => Err(Error::new("SSH_AUTH_SOCK is not valid UTF-8")),
        })?;
    #[cfg(target_os = "macos")]
    let fallback = std::env::var_os("HOME").map(|home| {
        PathBuf::from(home).join("Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock")
    });
    #[cfg(not(target_os = "macos"))]
    let fallback: Option<PathBuf> = None;
    choose_socket(None, environment.as_deref(), fallback.as_deref())
}

fn config_file() -> Result<&'static Path, Error> {
    CONFIG_FILE
        .get()
        .map(PathBuf::as_path)
        .ok_or_else(Error::bad_config)
}

fn read_setting(file: &Path) -> Result<Option<String>, Error> {
    match std::fs::read(file) {
        Ok(data) => serde_json::from_slice(&data)
            .map_err(|error| Error::new(format!("Invalid SSH-agent setting: {error}"))),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

fn write_setting(file: &Path, socket: Option<String>) -> Result<(), Error> {
    let socket = socket
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    if let Some(socket) = &socket {
        validate_socket(socket)?;
    }
    std::fs::create_dir_all(file.parent().ok_or_else(Error::bad_config)?)?;
    let temporary = file.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
    let data = serde_json::to_vec(&socket).map_err(|error| Error::new(error.to_string()))?;
    let result = std::fs::write(&temporary, data).and_then(|_| std::fs::rename(&temporary, file));
    if result.is_err() {
        let _ = std::fs::remove_file(&temporary);
    }
    result.map_err(Error::from)
}

fn choose_socket(
    configured: Option<String>,
    environment: Option<&str>,
    fallback: Option<&Path>,
) -> Result<Option<String>, Error> {
    if let Some(socket) = configured
        .as_deref()
        .or(environment.filter(|value| !value.is_empty()))
    {
        validate_socket(socket)?;
        return Ok(Some(socket.to_string()));
    }
    #[cfg(unix)]
    if let Some(socket) = fallback {
        use std::os::unix::fs::FileTypeExt;
        if std::fs::metadata(socket).is_ok_and(|metadata| metadata.file_type().is_socket()) {
            return socket
                .to_str()
                .map(|s| Some(s.to_string()))
                .ok_or_else(|| Error::new("SSH-agent socket path is not valid UTF-8"));
        }
    }
    #[cfg(not(unix))]
    let _ = fallback;
    Ok(None)
}

fn validate_socket(socket: &str) -> Result<(), Error> {
    if socket.contains('\0') || !Path::new(socket).is_absolute() {
        return Err(Error::new(
            "SSH-agent socket must be an absolute path without NUL characters",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explicit_socket_takes_priority_and_invalid_overrides_are_not_ignored() {
        let explicit = std::env::temp_dir()
            .join("custom agent.sock")
            .to_str()
            .unwrap()
            .to_string();
        let environment = std::env::temp_dir()
            .join("environment.sock")
            .to_str()
            .unwrap()
            .to_string();
        assert_eq!(
            choose_socket(Some(explicit.clone()), Some(&environment), None).unwrap(),
            Some(explicit)
        );
        assert_eq!(
            choose_socket(None, Some(&environment), None).unwrap(),
            Some(environment)
        );
        assert!(choose_socket(Some("relative.sock".into()), None, None).is_err());
        assert!(choose_socket(None, Some("bad\0socket"), None).is_err());
        assert_eq!(choose_socket(None, Some(""), None).unwrap(), None);
    }

    #[test]
    fn setting_survives_reload_and_can_be_cleared() {
        let dir = std::env::temp_dir().join(format!("devman-agent-{}", uuid::Uuid::new_v4()));
        let file = dir.join("ssh-agent.json");
        let socket = dir.join("custom agent.sock").to_str().unwrap().to_string();
        assert_eq!(read_setting(&file).unwrap(), None);
        write_setting(&file, Some(socket.clone())).unwrap();
        assert_eq!(read_setting(&file).unwrap(), Some(socket.clone()));
        assert!(write_setting(&file, Some("relative.sock".into())).is_err());
        assert_eq!(read_setting(&file).unwrap(), Some(socket));
        write_setting(&file, Some("  ".into())).unwrap();
        assert_eq!(read_setting(&file).unwrap(), None);
        std::fs::write(&file, "broken json").unwrap();
        assert!(read_setting(&file).is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn automatic_fallback_requires_a_real_socket() {
        use std::os::unix::net::UnixListener;
        let dir = std::env::temp_dir().join(format!("dma-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(&dir).unwrap();
        let socket = dir.join("agent.sock");
        assert_eq!(choose_socket(None, None, Some(&socket)).unwrap(), None);
        std::fs::write(&socket, "not a socket").unwrap();
        assert_eq!(choose_socket(None, None, Some(&socket)).unwrap(), None);
        std::fs::remove_file(&socket).unwrap();
        let listener = UnixListener::bind(&socket).unwrap();
        assert_eq!(
            choose_socket(None, None, Some(&socket)).unwrap(),
            Some(socket.to_str().unwrap().to_string())
        );
        drop(listener);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
