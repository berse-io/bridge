import chai, { expect, should, assert } from 'chai';
import 'mocha';
import { describe, it, setup, teardown } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
import chaiSinon from 'sinon-chai'
chai.use(chaiAsPromised);
chai.use(chaiSinon)