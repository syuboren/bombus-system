class NotImplementedError extends Error {
  constructor(message = 'Platform not implemented') {
    super(message);
    this.name = 'NotImplementedError';
    this.code = 'NOT_IMPLEMENTED';
  }
}

class PlatformTimeoutError extends Error {
  constructor(platform, timeoutMs) {
    super(`Platform ${platform} call timed out after ${timeoutMs}ms`);
    this.name = 'PlatformTimeoutError';
    this.code = 'PLATFORM_TIMEOUT';
    this.platform = platform;
    this.timeoutMs = timeoutMs;
  }
}

class BasePlatformPublisher {
  get platform() {
    throw new Error('Subclass must define platform');
  }

  async publish(_jobData) {
    throw new NotImplementedError(`${this.platform}.publish not implemented`);
  }

  async update(_platformJobId, _jobData) {
    throw new NotImplementedError(`${this.platform}.update not implemented`);
  }

  async close(_platformJobId) {
    throw new NotImplementedError(`${this.platform}.close not implemented`);
  }

  async reopen(_platformJobId) {
    throw new NotImplementedError(`${this.platform}.reopen not implemented`);
  }
}

module.exports = {
  BasePlatformPublisher,
  NotImplementedError,
  PlatformTimeoutError
};
