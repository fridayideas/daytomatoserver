const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

const server = require('../index');

function getPins() {
  return Array.from(new Array(10).keys()).map(i => ({
    name: `Test${i}`,
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
  before(() => server.connect().then((res) => {
    app = res.app;
    db = res.db;
    pins = db.collection('pins');
    accounts = db.collection('accounts');
    return db;
  }));

  // reset db
  beforeEach(() => pins.deleteMany());

  describe('GET pins', () => {
    beforeEach(() => pins.insertMany(getPins()));

    it('should get all the pins', () =>
      chai.request(app)
        .get('/api/pins')
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

    it('should filter pins by coordinates', () =>
      chai.request(app)
        .get('/api/pins')
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
          expect(created.duration).to.equal(-1);
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
      name: 'Test1', cost: 25.0, likes: 0,
    }).then((res) => {
      inserted = res.ops[0];
      return accounts.insertOne({});
    }).then((res) => {
      account = res.ops[0];
    }));

    describe('POST pin likes', () => {
      it('should add likes to a pin', () =>
        chai.request(app)
          .post(`/api/pins/${inserted._id}/likes`)
          .send({ accountId: account._id })
          .then((res) => {
            expect(res).to.have.status(204);
            return pins.findOne().then((p) => {
              expect(p.likes).to.equal(1);
              expect(p.dislikedBy).to.be.empty;
              expect(p.likedBy.length).to.equal(1);
              expect(p.likedBy).to.contain(String(account._id));
            });
          })
          .catch((err) => {
            throw err;
          }));
    });

    describe('POST pin dislikes', () => {
      it('should add dislikes to a pin', () =>
        chai.request(app)
          .post(`/api/pins/${inserted._id}/dislikes`)
          .send({ accountId: account._id })
          .then((res) => {
            expect(res).to.have.status(204);
            return pins.findOne().then((p) => {
              expect(p.likes).to.equal(-1);
              expect(p.likedBy).to.be.empty;
              expect(p.dislikedBy).to.contain(String(account._id));
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
