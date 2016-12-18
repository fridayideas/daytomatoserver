const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

// Set up env vars
require('dotenv').config();

const { TEST_JWT } = require('./auth_bootstrap');
const server = require('../index');

describe('Accounts', () => {
  let app;
  let db;
  let pins;
  let accounts;
  before(() => server.connect(5001).then((res) => {
    app = res.app;
    db = res.db;
    pins = db.collection('pins');
    accounts = db.collection('accounts');
    return db;
  }));

  // reset db
  afterEach(() => pins.deleteMany());
  afterEach(() => accounts.deleteMany());

  describe('GET Accounts', () => {
    it('should create a new user account if none exists', () =>
      chai.request(app)
        .get('/api/accounts/currentuser')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .then((res) => {
          expect(res).to.have.status(200);
          const account = res.body;
          expect(account.createDate).to.be.not.empty;
          expect(account.username).to.equal('TestUser');
          expect(account.numSeeds).to.equal(0);
          expect(account.numPins).to.equal(0);
        })
        .catch((err) => {
          throw err;
        }));
    it('should find an existing user account', () =>
      accounts.insertOne({
        username: 'TestUser',
        auth0Id: process.env.TEST_USER_SUB,
        createDate: new Date(),
        numSeeds: 10,
        numPins: 5,
      }).then(res => res.ops[0]).then(acct =>
        chai.request(app)
          .get('/api/accounts/currentuser')
          .set('Authorization', `Bearer ${TEST_JWT}`)
          .then((res) => {
            expect(res).to.have.status(200);
            const account = res.body;
            expect(new Date(account.createDate)).to.eql(acct.createDate);
            expect(account.username).to.equal(acct.username);
            expect(account.numSeeds).to.equal(acct.numSeeds);
            expect(account.numPins).to.equal(acct.numPins);
          })
      ).catch((err) => {
        throw err;
      }));
  });
});
