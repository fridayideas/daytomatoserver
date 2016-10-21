const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

// Set up env vars
require('dotenv').config();
const server = require('../index');

describe('Accounts', () => {});
