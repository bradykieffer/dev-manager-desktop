export declare interface Device {
    name: string;
    host: string;
    port: number;
    username: 'prisoner' | 'root' | string;
    profile: 'ose';
    privateKey?: { openSsh: string };
    passphrase?: string;
    password?: string;
    description?: string;
    default?: boolean;
    indelible?: boolean;
    files?: string;
}

export enum NewDeviceAuthentication {
    Password = 'password',
    LocalKey = 'localKey',
    AppKey = 'appKey',
    DevKey = 'devKey',
    Agent = 'agent',
}

export const AppPrivKeyName = 'id_devman';

export declare interface NewDeviceBase extends Omit<Device, 'privateKey' | 'passphrase' | 'password'> {
    new: true;
    name: string;
    description?: string;
    host: string;
    port: number;
    username: string;
}

export declare interface NewDeviceWithPassword extends NewDeviceBase {
    password: string;
}

export declare interface NewDeviceWithLocalPrivateKey extends NewDeviceBase {
    privateKey: {
        openSsh: string;
    };
    passphrase?: string;
}

export declare interface NewDeviceWithAppPrivateKey extends NewDeviceBase {
    privateKey: {
        openSsh: typeof AppPrivKeyName;
    };
    passphrase?: string;
}

export declare interface NewDeviceWithDevicePrivateKey extends NewDeviceBase {
    privateKey: {
        openSshData: string;
    };
    passphrase: string;
}

// No stored credentials: authenticate with the local SSH agent.
export declare interface NewDeviceWithAgent extends NewDeviceBase {
}

export type NewDevice =
    NewDeviceWithAgent
    | NewDeviceWithPassword
    | NewDeviceWithLocalPrivateKey
    | NewDeviceWithAppPrivateKey
    | NewDeviceWithDevicePrivateKey;

export type DeviceLike = Device | NewDevice;
