const { BasePlatformPublisher, NotImplementedError } = require('./base');

class Publisher1111 extends BasePlatformPublisher {
  get platform() {
    return '1111';
  }

  async publish(_jobData) {
    throw new NotImplementedError('1111 platform not implemented');
  }

  async update(_platformJobId, _jobData) {
    throw new NotImplementedError('1111 platform not implemented');
  }

  async close(_platformJobId) {
    throw new NotImplementedError('1111 platform not implemented');
  }

  async reopen(_platformJobId) {
    throw new NotImplementedError('1111 platform not implemented');
  }
}

module.exports = { Publisher1111 };
