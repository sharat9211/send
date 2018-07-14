const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();
const conf = require('../../server/config.js');

const stream = {};
class MockStorage {
  length() {
    return Promise.resolve(12);
  }
  getStream() {
    return stream;
  }
  set() {
    return Promise.resolve();
  }
  del() {
    return Promise.resolve();
  }
  ping() {
    return Promise.resolve();
  }
}

const expire_seconds = 10;
const storage = proxyquire('../../server/storage', {
  '../config': {
    default_expire_seconds: expire_seconds,
    num_of_buckets: conf.num_of_buckets,
    expire_times_seconds: conf.expire_times_seconds,
    s3_buckets: ['foo', 'bar', 'baz'],
    env: 'development',
    redis_host: 'localhost'
  },
  '../log': () => {},
  './s3': MockStorage
});

describe('Storage', function() {
  describe('ttl', function() {
    it('returns milliseconds remaining', async function() {
      await storage.set('x', null, { foo: 'bar' });
      const ms = await storage.ttl('x');
      await storage.del('x');
      assert.equal(ms, expire_seconds * 1000);
    });
  });

  describe('length', function() {
    it('returns the file size', async function() {
      await storage.set('x', null);
      const len = await storage.length('x');
      assert.equal(len, 12);
    });
  });

  describe('get', function() {
    it('returns a stream', async function() {
      await storage.set('x', null);
      const s = await storage.get('x');
      assert.equal(s, stream);
    });
  });

  describe('set', function() {
    it('sets expiration to expire time', async function() {
      const seconds = 100;
      await storage.set('x', null, { foo: 'bar' }, seconds);
      const s = await storage.redis.ttlAsync('x');
      await storage.del('x');
      assert.equal(Math.ceil(s), seconds);
    });

    it('puts into right bucket based on expire time', async function() {
      await storage.set('x', null, { foo: 'bar' }, 60 * 60 * 24);
      const bucketX = await storage.getBucket('x');
      assert.equal(bucketX, 0);

      await storage.set('y', null, { foo: 'bar' }, 60 * 60 * 24 * 7);
      const bucketY = await storage.getBucket('y');
      assert.equal(bucketY, 1);

      await storage.set('z', null, { foo: 'bar' }, 60 * 60 * 24 * 14);
      const bucketZ = await storage.getBucket('z');
      assert.equal(bucketZ, 2);
    });

    it('sets metadata', async function() {
      const m = { foo: 'bar' };
      await storage.set('x', null, m);
      const meta = await storage.redis.hgetallAsync('x');
      delete meta.bucket;
      await storage.del('x');
      assert.deepEqual(meta, m);
    });

    //it('throws when storage fails');
  });

  describe('setField', function() {
    it('works', async function() {
      await storage.set('x', null);
      storage.setField('x', 'y', 'z');
      const z = await storage.redis.hgetAsync('x', 'y');
      assert.equal(z, 'z');
      await storage.del('x');
    });
  });

  describe('del', function() {
    it('works', async function() {
      await storage.set('x', null, { foo: 'bar' });
      await storage.del('x');
      const meta = await storage.metadata('x');
      assert.equal(meta, null);
    });
  });

  describe('ping', function() {
    it('works', async function() {
      await storage.ping();
    });
  });

  describe('metadata', function() {
    it('returns all metadata fields', async function() {
      const m = {
        pwd: true,
        dl: 1,
        dlimit: 1,
        auth: 'foo',
        metadata: 'bar',
        nonce: 'baz',
        owner: 'bmo'
      };
      await storage.set('x', null, m);
      const meta = await storage.metadata('x');
      assert.deepEqual(meta, m);
    });
  });
});
