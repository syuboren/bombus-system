const { Publisher104 } = require('./104.adapter');
const { Publisher518 } = require('./518.adapter');
const { Publisher1111 } = require('./1111.adapter');
const {
  BasePlatformPublisher,
  NotImplementedError,
  PlatformTimeoutError
} = require('./base');

const SUPPORTED_PLATFORMS = ['104', '518', '1111'];
const ENABLED_PLATFORMS = ['104'];

const registry = {
  '104': new Publisher104(),
  '518': new Publisher518(),
  '1111': new Publisher1111()
};

function getPublisher(platform) {
  return registry[platform] || null;
}

function isEnabled(platform) {
  return ENABLED_PLATFORMS.includes(platform);
}

module.exports = {
  getPublisher,
  isEnabled,
  SUPPORTED_PLATFORMS,
  ENABLED_PLATFORMS,
  BasePlatformPublisher,
  NotImplementedError,
  PlatformTimeoutError
};
