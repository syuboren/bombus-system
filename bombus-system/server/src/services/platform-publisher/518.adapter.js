const { BasePlatformPublisher, NotImplementedError } = require('./base');

class Publisher518 extends BasePlatformPublisher {
  get platform() {
    return '518';
  }

  async publish(_jobData) {
    throw new NotImplementedError('518 platform not implemented');
  }

  async update(_platformJobId, _jobData) {
    throw new NotImplementedError('518 platform not implemented');
  }

  async close(_platformJobId) {
    throw new NotImplementedError('518 platform not implemented');
  }

  async reopen(_platformJobId) {
    throw new NotImplementedError('518 platform not implemented');
  }
}

module.exports = { Publisher518 };
