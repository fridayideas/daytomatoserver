const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

// Set up env vars
require('dotenv').config();

const { TEST_JWT } = require('./auth_bootstrap');
const server = require('../index');

function getPins() {
  return Array.from(new Array(10).keys()).map(i => ({
    name: `Test${9 - i}`,
    cost: i * 10,
    coordinate: {
      latitude: (i * 10) - 50,
      longitude: (i * 10) - 50,
    },
  }));
}

describe('Pins', () => {
  let app;
  let db;
  let pins;
  let accounts;
  before(() => server.connect(5000).then((res) => {
    app = res.app;
    db = res.db;
    pins = db.collection('pins');
    accounts = db.collection('accounts');
    return db;
  }));

  // reset db
  afterEach(() => pins.deleteMany());
  afterEach(() => accounts.deleteMany());

  describe('GET pins', () => {
    beforeEach(() => pins.insertMany(getPins()));

    it('should get all the pins', () =>
      chai.request(app)
        .get('/api/pins')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.a('array');
        })
        .catch((err) => {
          throw err;
        }));

    it('should get a limited number of pins', () =>
      chai.request(app)
        .get('/api/pins')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .query({ limit: 5 })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(5);
        })
        .catch((err) => {
          throw err;
        }));

    it('should sort pins by name', () =>
      chai.request(app)
        .get('/api/pins')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .query({ sort: 'name' })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res.body.map(p => p.name)).to.deep.equal([
            'Test0', 'Test1', 'Test2', 'Test3', 'Test4',
            'Test5', 'Test6', 'Test7', 'Test8', 'Test9',
          ]);
        })
        .catch((err) => {
          throw err;
        }));

    it('should filter pins by cost', () =>
      chai.request(app)
        .get('/api/pins')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .query({ cost: '20,30' })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res.body.map(p => p.name)).to.deep.equal([
            'Test7', 'Test6',
          ]);
        })
        .catch((err) => {
          throw err;
        }));

    it('should filter pins by coordinates', () =>
      chai.request(app)
        .get('/api/pins')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .query({ searchArea: [50, 50, 0, 0].join() })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.length(5);
        })
        .catch((err) => {
          throw err;
        }));
  });

  describe('POST pins', () => {
    it('should set default property values', () =>
      chai.request(app)
        .post('/api/pins')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send({ name: 'Test1' })
        .then((res) => {
          expect(res).to.have.status(201);
          const created = res.body;
          expect(created.name).to.equal('Test1');
          expect(created.createDate).to.be.not.empty;
          expect(created.cost).to.equal(0.0);
          expect(created.image).to.equal('');
          expect(created.review).to.equal('');
          expect(created.likes).to.equal(0);
          expect(created.comments).to.be.empty;
          expect(created.expireAt).to.equal(null);
        })
        .catch((err) => {
          throw err;
        }));
  });

  describe('PUT pins', () => {
    let inserted;
    beforeEach(() => pins.insertOne({
      name: 'Test1', cost: 25.0, likes: 0,
    }).then((res) => {
      inserted = res.ops[0];
    }));

    it('should update a particular pin', () =>
      chai.request(app)
        .put(`/api/pins/${inserted._id}`)
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send({
          name: 'Updated',
          cost: 11.0,
          likes: 5,
        })
        .then((res) => {
          expect(res).to.have.status(204);
          return pins.findOne().then((p) => {
            expect(p._id).to.deep.equal(inserted._id);
            expect(p.name).to.not.equal(inserted.name);
            expect(p.cost).to.not.equal(inserted.cost);
            expect(p.likes).to.not.equal(inserted.likes);
          });
        })
        .catch((err) => {
          throw err;
        }));
  });

  describe('DELETE pins', () => {
    let inserted;
    beforeEach(() => pins.insertOne({
      name: 'Test1', cost: 25.0, likes: 0,
    }).then((res) => {
      inserted = res.ops[0];
    }));

    it('should update a particular pin', () =>
      chai.request(app)
        .delete(`/api/pins/${inserted._id}`)
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .then((res) => {
          expect(res).to.have.status(204);
          return pins.count().then((count) => {
            expect(count).to.be.equal(0);
          });
        })
        .catch((err) => {
          throw err;
        }));
  });

  describe('Pin likes and dislikes', () => {
    let inserted;
    let account;
    beforeEach(() => pins.insertOne({
      name: 'Test1',
      cost: 25.0,
      likes: 0,
      likedBy: [],
      dislikedBy: [],
    }).then((res) => {
      inserted = res.ops[0];
      return accounts.insertOne({
        auth0Id: process.env.TEST_USER_SUB,
        username: 'TestUser',
      });
    }).then((res) => {
      account = res.ops[0];
    }));

    describe('Pin likes', () => {
      it('should add likes to a pin', () =>
        chai.request(app)
          .put(`/api/pins/${inserted._id}/votes/${account._id}`)
          .set('Authorization', `Bearer ${TEST_JWT}`)
          .send({ dir: 1 })
          .then((res) => {
            expect(res).to.have.status(204);
            return pins.findOne().then((p) => {
              expect(p.likes).to.equal(1);
              expect(p.dislikedBy).to.be.empty;
              expect(p.likedBy.length).to.equal(1);
              expect(p.likedBy).to.contain(account._id);
            });
          })
          .catch((err) => {
            throw err;
          }));

      it('should error on duplicate likes', () =>
        pins.update({ _id: inserted._id }, {
          $addToSet: { likedBy: account._id },
          $inc: { likes: 1 },
        }).then(_ =>
          chai.request(app)
            .put(`/api/pins/${inserted._id}/votes/${account._id}`)
            .set('Authorization', `Bearer ${TEST_JWT}`)
            .send({ dir: 1 })
        ).catch((err) => {
          expect(err.response).to.have.status(409);
        }));

      it('should remove likes from a pin', () =>
        pins.update({ _id: inserted._id }, {
          $addToSet: { likedBy: account._id },
          $inc: { likes: 1 },
        }).then(_ =>
          chai.request(app)
            .put(`/api/pins/${inserted._id}/votes/${account._id}`)
            .set('Authorization', `Bearer ${TEST_JWT}`)
            .send({ dir: 0 })
        ).then((res) => {
          expect(res).to.have.status(204);
          return pins.findOne().then((p) => {
            expect(p.likes).to.equal(0);
            expect(p.likedBy).to.be.empty;
          });
        })
        .catch((err) => {
          throw err;
        }));
    });

    describe('Pin dislikes', () => {
      it('should add dislikes to a pin', () =>
        chai.request(app)
          .put(`/api/pins/${inserted._id}/votes/${account._id}`)
          .set('Authorization', `Bearer ${TEST_JWT}`)
          .send({ dir: -1 })
          .then((res) => {
            expect(res).to.have.status(204);
            return pins.findOne().then((p) => {
              expect(p.likes).to.equal(-1);
              expect(p.likedBy).to.be.empty;
              expect(p.dislikedBy.length).to.equal(1);
              expect(p.dislikedBy).to.contain(account._id);
            });
          })
          .catch((err) => {
            throw err;
          }));

      it('should error on duplicate dislikes', () =>
        pins.update({ _id: inserted._id }, {
          $addToSet: { dislikedBy: account._id },
          $inc: { likes: 1 },
        }).then(_ =>
          chai.request(app)
            .put(`/api/pins/${inserted._id}/votes/${account._id}`)
            .set('Authorization', `Bearer ${TEST_JWT}`)
            .send({ dir: -1 })
        ).catch((err) => {
          expect(err.response).to.have.status(409);
        }));

      it('should remove dislikes from a pin', () =>
        pins.update({ _id: inserted._id }, {
          $addToSet: { dislikedBy: account._id },
          $inc: { likes: -1 },
        }).then(_ =>
          chai.request(app)
            .put(`/api/pins/${inserted._id}/votes/${account._id}`)
            .set('Authorization', `Bearer ${TEST_JWT}`)
            .send({ dir: 0 })
        ).then((res) => {
          expect(res).to.have.status(204);
          return pins.findOne().then((p) => {
            expect(p.likes).to.equal(0);
            expect(p.dislikedBy).to.be.empty;
          });
        })
        .catch((err) => {
          throw err;
        }));
    });
  });

  describe('Pin comments', () => {
    // TODO
    describe('POST comment on pin', () => {
      // TODO
    });
    describe('GET comment on pin', () => {
      // TODO
    });
    describe('PUT comment on pin', () => {
      // TODO
    });
    describe('DELETE comment on pin', () => {
      // TODO
    });
  });
});
