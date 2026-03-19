const { PostHog } = require('posthog-node');

const client = new PostHog('phc_WFm3O5H7wkZK2Ne3kyy5QgUXJR8y86SQbszSwk3BUn0', {
  host: 'https://us.i.posthog.com'
});

function track(event, properties = {}) {
  client.capture({
    distinctId: 'anonymous',
    event,
    properties: {
      ...properties,
      cli_version: require('../../package.json').version,
    }
  });
}

async function shutdown() {
  await client.shutdown();
}

module.exports = { track, shutdown };