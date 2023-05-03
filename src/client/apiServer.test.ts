import chai from "chai";
import { expect } from "chai";
import chaiHttp from "chai-http";

chai.use(chaiHttp);

describe("api endpoint tests", function () {
  it("should return a status of 200 if the the blocks sync", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/syncStatus")
      .end(function (err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("isSynced").that.is.a("boolean");
        done();
      });
  });

  it("should return the latest block hash", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/latestHash")
      .end(function (_err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("blockHash").that.is.a("string");
        done();
      });
  });

  it("should return the latest local hash", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/latestLocalHash")
      .end(function (err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("blockHash").that.is.a("string");
        done();
      });
  });

  it("should return the bls public key in hex", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/blsPubKeyInHex")
      .end(function (_err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("blsPubKeyInHex").that.is.a("string");
        done();
      });
  });

  it("should return an array of tosi chains", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/tosiChains")
      .end(function (err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an("array").that.is.empty;
        done();
      });
  });
});
