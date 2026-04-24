const job104Service = require('../104/job.service');
const { BasePlatformPublisher, PlatformTimeoutError } = require('./base');

const TIMEOUT_MS = 15000;

function withTimeout(promise, platform) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new PlatformTimeoutError(platform, TIMEOUT_MS)),
      TIMEOUT_MS
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class Publisher104 extends BasePlatformPublisher {
  get platform() {
    return '104';
  }

  async publish(jobData) {
    const result = await withTimeout(job104Service.postJob(jobData), this.platform);
    return { platformJobId: result?.jobNo ?? null, raw: result };
  }

  async update(platformJobId, jobData) {
    const result = await withTimeout(
      job104Service.updateJob(platformJobId, jobData),
      this.platform
    );
    return { raw: result };
  }

  async close(platformJobId) {
    const result = await withTimeout(
      job104Service.patchJobStatus(platformJobId, { switch: 'off' }),
      this.platform
    );
    return { raw: result };
  }

  async reopen(platformJobId) {
    const result = await withTimeout(
      job104Service.patchJobStatus(platformJobId, { switch: 'on' }),
      this.platform
    );
    return { raw: result };
  }
}

module.exports = { Publisher104 };
