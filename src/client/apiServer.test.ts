import chai from "chai";
import { expect } from "chai";
import chaiHttp from "chai-http";

chai.use(chaiHttp);

describe("GET /api/syncStatus", function () {
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
});

describe("GET /api/latestHash", function () {
  it("should return the latest block hash", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/latestBlockHash")
      .end(function (_err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("blockHash").that.is.a("string");
        done();
      });
  });

  it("should return a 404 error if the latest block hash is not found", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/latestLocalHash")
      .end(function (err, res) {
        expect(res).to.have.status(404);
        expect(res.body).to.have.property("error").that.equals("none");
        done();
      });
  });
});

describe("GET /api/latestLocalHash", function () {
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
  it("should return a 500 error if the latest local hash is not found", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/latestLocalHash")
      .end(function (err, res) {
        expect(res).to.have.status(500);
        expect(res.body).to.have.property("error").that.equals("none");
        done();
      });
  });
});

describe("GET /api/blsPubKeyInHex", function () {
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
  it("should return a 500 error if the bls public key in hex is not found", function (done) {
    chai
      .request("http://localhost:30001")
      .get("/api/blsPubKeyInHex")
      .end(function (err, res) {
        expect(res).to.have.status(500);
        expect(res.body).to.have.property("error").that.is.a("string");
        done();
      });
  });
});

describe("GET /api/tosiChains", function () {
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
