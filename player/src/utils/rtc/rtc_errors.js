export class RTCError extends Error {}
export class RTCPeerOperationError extends RTCError { constructor() { super("Operation error"); } }
export class RTCPeerOperationTimeout extends RTCError { constructor() { super("Timeout"); } }
export class RTCChannelClosed extends RTCError { constructor() { super("Channel has been closed"); } }