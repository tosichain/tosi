// package: blockchain
// file: blockchain.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class SignedTransaction extends jspb.Message { 
    getFrom(): string;
    setFrom(value: string): SignedTransaction;
    getSignature(): string;
    setSignature(value: string): SignedTransaction;

    hasTxn(): boolean;
    clearTxn(): void;
    getTxn(): Transaction | undefined;
    setTxn(value?: Transaction): SignedTransaction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignedTransaction.AsObject;
    static toObject(includeInstance: boolean, msg: SignedTransaction): SignedTransaction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignedTransaction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignedTransaction;
    static deserializeBinaryFromReader(message: SignedTransaction, reader: jspb.BinaryReader): SignedTransaction;
}

export namespace SignedTransaction {
    export type AsObject = {
        from: string,
        signature: string,
        txn?: Transaction.AsObject,
    }
}

export class Transaction extends jspb.Message { 

    hasMint(): boolean;
    clearMint(): void;
    getMint(): MintToken | undefined;
    setMint(value?: MintToken): Transaction;

    hasTransfer(): boolean;
    clearTransfer(): void;
    getTransfer(): TransferToken | undefined;
    setTransfer(value?: TransferToken): Transaction;

    hasStake(): boolean;
    clearStake(): void;
    getStake(): StakeToken | undefined;
    setStake(value?: StakeToken): Transaction;

    hasUnstake(): boolean;
    clearUnstake(): void;
    getUnstake(): UnstakeToken | undefined;
    setUnstake(value?: UnstakeToken): Transaction;

    hasCreateChain(): boolean;
    clearCreateChain(): void;
    getCreateChain(): CreateDataChain | undefined;
    setCreateChain(value?: CreateDataChain): Transaction;

    hasUpdateChain(): boolean;
    clearUpdateChain(): void;
    getUpdateChain(): UpdateDataChain | undefined;
    setUpdateChain(value?: UpdateDataChain): Transaction;
    getNonce(): number;
    setNonce(value: number): Transaction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Transaction.AsObject;
    static toObject(includeInstance: boolean, msg: Transaction): Transaction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Transaction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Transaction;
    static deserializeBinaryFromReader(message: Transaction, reader: jspb.BinaryReader): Transaction;
}

export namespace Transaction {
    export type AsObject = {
        mint?: MintToken.AsObject,
        transfer?: TransferToken.AsObject,
        stake?: StakeToken.AsObject,
        unstake?: UnstakeToken.AsObject,
        createChain?: CreateDataChain.AsObject,
        updateChain?: UpdateDataChain.AsObject,
        nonce: number,
    }
}

export class MintToken extends jspb.Message { 
    getReceiver(): string;
    setReceiver(value: string): MintToken;
    getAmount(): string;
    setAmount(value: string): MintToken;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MintToken.AsObject;
    static toObject(includeInstance: boolean, msg: MintToken): MintToken.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MintToken, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MintToken;
    static deserializeBinaryFromReader(message: MintToken, reader: jspb.BinaryReader): MintToken;
}

export namespace MintToken {
    export type AsObject = {
        receiver: string,
        amount: string,
    }
}

export class TransferToken extends jspb.Message { 
    getReceiver(): string;
    setReceiver(value: string): TransferToken;
    getAmount(): string;
    setAmount(value: string): TransferToken;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TransferToken.AsObject;
    static toObject(includeInstance: boolean, msg: TransferToken): TransferToken.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TransferToken, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TransferToken;
    static deserializeBinaryFromReader(message: TransferToken, reader: jspb.BinaryReader): TransferToken;
}

export namespace TransferToken {
    export type AsObject = {
        receiver: string,
        amount: string,
    }
}

export class StakeToken extends jspb.Message { 
    getStakeType(): StakeType;
    setStakeType(value: StakeType): StakeToken;
    getAmount(): string;
    setAmount(value: string): StakeToken;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StakeToken.AsObject;
    static toObject(includeInstance: boolean, msg: StakeToken): StakeToken.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StakeToken, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StakeToken;
    static deserializeBinaryFromReader(message: StakeToken, reader: jspb.BinaryReader): StakeToken;
}

export namespace StakeToken {
    export type AsObject = {
        stakeType: StakeType,
        amount: string,
    }
}

export class UnstakeToken extends jspb.Message { 
    getStakeType(): StakeType;
    setStakeType(value: StakeType): UnstakeToken;
    getAmount(): string;
    setAmount(value: string): UnstakeToken;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UnstakeToken.AsObject;
    static toObject(includeInstance: boolean, msg: UnstakeToken): UnstakeToken.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UnstakeToken, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UnstakeToken;
    static deserializeBinaryFromReader(message: UnstakeToken, reader: jspb.BinaryReader): UnstakeToken;
}

export namespace UnstakeToken {
    export type AsObject = {
        stakeType: StakeType,
        amount: string,
    }
}

export class CreateDataChain extends jspb.Message { 

    hasRootClaim(): boolean;
    clearRootClaim(): void;
    getRootClaim(): ComputeClaim | undefined;
    setRootClaim(value?: ComputeClaim): CreateDataChain;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateDataChain.AsObject;
    static toObject(includeInstance: boolean, msg: CreateDataChain): CreateDataChain.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateDataChain, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateDataChain;
    static deserializeBinaryFromReader(message: CreateDataChain, reader: jspb.BinaryReader): CreateDataChain;
}

export namespace CreateDataChain {
    export type AsObject = {
        rootClaim?: ComputeClaim.AsObject,
    }
}

export class UpdateDataChain extends jspb.Message { 
    getRootClaimHash(): string;
    setRootClaimHash(value: string): UpdateDataChain;

    hasClaim(): boolean;
    clearClaim(): void;
    getClaim(): ComputeClaim | undefined;
    setClaim(value?: ComputeClaim): UpdateDataChain;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UpdateDataChain.AsObject;
    static toObject(includeInstance: boolean, msg: UpdateDataChain): UpdateDataChain.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UpdateDataChain, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UpdateDataChain;
    static deserializeBinaryFromReader(message: UpdateDataChain, reader: jspb.BinaryReader): UpdateDataChain;
}

export namespace UpdateDataChain {
    export type AsObject = {
        rootClaimHash: string,
        claim?: ComputeClaim.AsObject,
    }
}

export class WorldState extends jspb.Message { 
    clearAccountsList(): void;
    getAccountsList(): Array<Account>;
    setAccountsList(value: Array<Account>): WorldState;
    addAccounts(value?: Account, index?: number): Account;

    hasStakePool(): boolean;
    clearStakePool(): void;
    getStakePool(): StakePool | undefined;
    setStakePool(value?: StakePool): WorldState;
    getMinter(): string;
    setMinter(value: string): WorldState;
    clearDataChainsList(): void;
    getDataChainsList(): Array<DataChain>;
    setDataChainsList(value: Array<DataChain>): WorldState;
    addDataChains(value?: DataChain, index?: number): DataChain;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): WorldState.AsObject;
    static toObject(includeInstance: boolean, msg: WorldState): WorldState.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: WorldState, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): WorldState;
    static deserializeBinaryFromReader(message: WorldState, reader: jspb.BinaryReader): WorldState;
}

export namespace WorldState {
    export type AsObject = {
        accountsList: Array<Account.AsObject>,
        stakePool?: StakePool.AsObject,
        minter: string,
        dataChainsList: Array<DataChain.AsObject>,
    }
}

export class Account extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): Account;
    getNonce(): number;
    setNonce(value: number): Account;
    getBalance(): string;
    setBalance(value: string): Account;
    getDaVerifierStake(): string;
    setDaVerifierStake(value: string): Account;
    getStateVerifierStake(): string;
    setStateVerifierStake(value: string): Account;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Account.AsObject;
    static toObject(includeInstance: boolean, msg: Account): Account.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Account, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Account;
    static deserializeBinaryFromReader(message: Account, reader: jspb.BinaryReader): Account;
}

export namespace Account {
    export type AsObject = {
        address: string,
        nonce: number,
        balance: string,
        daVerifierStake: string,
        stateVerifierStake: string,
    }
}

export class StakePool extends jspb.Message { 
    getDaVerifierPool(): string;
    setDaVerifierPool(value: string): StakePool;
    clearDaVerifiersList(): void;
    getDaVerifiersList(): Array<string>;
    setDaVerifiersList(value: Array<string>): StakePool;
    addDaVerifiers(value: string, index?: number): string;
    getStateVerifierPool(): string;
    setStateVerifierPool(value: string): StakePool;
    clearStateVerifiersList(): void;
    getStateVerifiersList(): Array<string>;
    setStateVerifiersList(value: Array<string>): StakePool;
    addStateVerifiers(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StakePool.AsObject;
    static toObject(includeInstance: boolean, msg: StakePool): StakePool.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StakePool, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StakePool;
    static deserializeBinaryFromReader(message: StakePool, reader: jspb.BinaryReader): StakePool;
}

export namespace StakePool {
    export type AsObject = {
        daVerifierPool: string,
        daVerifiersList: Array<string>,
        stateVerifierPool: string,
        stateVerifiersList: Array<string>,
    }
}

export class DataChain extends jspb.Message { 
    clearClaimsList(): void;
    getClaimsList(): Array<ComputeClaim>;
    setClaimsList(value: Array<ComputeClaim>): DataChain;
    addClaims(value?: ComputeClaim, index?: number): ComputeClaim;
    getRootClaimHash(): string;
    setRootClaimHash(value: string): DataChain;
    getHeadClaimHash(): string;
    setHeadClaimHash(value: string): DataChain;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DataChain.AsObject;
    static toObject(includeInstance: boolean, msg: DataChain): DataChain.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DataChain, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DataChain;
    static deserializeBinaryFromReader(message: DataChain, reader: jspb.BinaryReader): DataChain;
}

export namespace DataChain {
    export type AsObject = {
        claimsList: Array<ComputeClaim.AsObject>,
        rootClaimHash: string,
        headClaimHash: string,
    }
}

export class ComputeClaim extends jspb.Message { 
    getClaimer(): string;
    setClaimer(value: string): ComputeClaim;
    getPrevClaimHash(): string;
    setPrevClaimHash(value: string): ComputeClaim;

    hasDataContract(): boolean;
    clearDataContract(): void;
    getDataContract(): ClaimDataRef | undefined;
    setDataContract(value?: ClaimDataRef): ComputeClaim;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): ClaimDataRef | undefined;
    setInput(value?: ClaimDataRef): ComputeClaim;

    hasOutput(): boolean;
    clearOutput(): void;
    getOutput(): ClaimDataRef | undefined;
    setOutput(value?: ClaimDataRef): ComputeClaim;
    getMaxCartesiCycles(): string;
    setMaxCartesiCycles(value: string): ComputeClaim;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ComputeClaim.AsObject;
    static toObject(includeInstance: boolean, msg: ComputeClaim): ComputeClaim.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ComputeClaim, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ComputeClaim;
    static deserializeBinaryFromReader(message: ComputeClaim, reader: jspb.BinaryReader): ComputeClaim;
}

export namespace ComputeClaim {
    export type AsObject = {
        claimer: string,
        prevClaimHash: string,
        dataContract?: ClaimDataRef.AsObject,
        input?: ClaimDataRef.AsObject,
        output?: ClaimDataRef.AsObject,
        maxCartesiCycles: string,
    }
}

export class ClaimDataRef extends jspb.Message { 
    getCid(): string;
    setCid(value: string): ClaimDataRef;
    getSize(): number;
    setSize(value: number): ClaimDataRef;
    getCartesimerkleroot(): string;
    setCartesimerkleroot(value: string): ClaimDataRef;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimDataRef.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimDataRef): ClaimDataRef.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimDataRef, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimDataRef;
    static deserializeBinaryFromReader(message: ClaimDataRef, reader: jspb.BinaryReader): ClaimDataRef;
}

export namespace ClaimDataRef {
    export type AsObject = {
        cid: string,
        size: number,
        cartesimerkleroot: string,
    }
}

export class DAInfo extends jspb.Message { 
    getName(): string;
    setName(value: string): DAInfo;
    getSize(): number;
    setSize(value: number): DAInfo;
    getLog2(): number;
    setLog2(value: number): DAInfo;
    getKeccak256(): string;
    setKeccak256(value: string): DAInfo;
    getCartesiMerkleRoot(): string;
    setCartesiMerkleRoot(value: string): DAInfo;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DAInfo.AsObject;
    static toObject(includeInstance: boolean, msg: DAInfo): DAInfo.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DAInfo, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DAInfo;
    static deserializeBinaryFromReader(message: DAInfo, reader: jspb.BinaryReader): DAInfo;
}

export namespace DAInfo {
    export type AsObject = {
        name: string,
        size: number,
        log2: number,
        keccak256: string,
        cartesiMerkleRoot: string,
    }
}

export class Block extends jspb.Message { 
    getVersion(): number;
    setVersion(value: number): Block;
    getPrevBlockHash(): Uint8Array | string;
    getPrevBlockHash_asU8(): Uint8Array;
    getPrevBlockHash_asB64(): string;
    setPrevBlockHash(value: Uint8Array | string): Block;
    clearAccountsMerkleList(): void;
    getAccountsMerkleList(): Array<Uint8Array | string>;
    getAccountsMerkleList_asU8(): Array<Uint8Array>;
    getAccountsMerkleList_asB64(): Array<string>;
    setAccountsMerkleList(value: Array<Uint8Array | string>): Block;
    addAccountsMerkle(value: Uint8Array | string, index?: number): Uint8Array | string;
    clearTransactionsList(): void;
    getTransactionsList(): Array<SignedTransaction>;
    setTransactionsList(value: Array<SignedTransaction>): Block;
    addTransactions(value?: SignedTransaction, index?: number): SignedTransaction;

    hasProof(): boolean;
    clearProof(): void;
    getProof(): BlockProof | undefined;
    setProof(value?: BlockProof): Block;
    getTime(): number;
    setTime(value: number): Block;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Block.AsObject;
    static toObject(includeInstance: boolean, msg: Block): Block.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Block, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Block;
    static deserializeBinaryFromReader(message: Block, reader: jspb.BinaryReader): Block;
}

export namespace Block {
    export type AsObject = {
        version: number,
        prevBlockHash: Uint8Array | string,
        accountsMerkleList: Array<Uint8Array | string>,
        transactionsList: Array<SignedTransaction.AsObject>,
        proof?: BlockProof.AsObject,
        time: number,
    }
}

export class BlockProof extends jspb.Message { 
    getTxnBundleHash(): string;
    setTxnBundleHash(value: string): BlockProof;
    getTxnBundleProposer(): string;
    setTxnBundleProposer(value: string): BlockProof;
    getRandomnessProof(): Uint8Array | string;
    getRandomnessProof_asU8(): Uint8Array;
    getRandomnessProof_asB64(): string;
    setRandomnessProof(value: Uint8Array | string): BlockProof;
    clearDaCheckResultsList(): void;
    getDaCheckResultsList(): Array<DACheckResult>;
    setDaCheckResultsList(value: Array<DACheckResult>): BlockProof;
    addDaCheckResults(value?: DACheckResult, index?: number): DACheckResult;
    getAggDaCheckResultSignature(): Uint8Array | string;
    getAggDaCheckResultSignature_asU8(): Uint8Array;
    getAggDaCheckResultSignature_asB64(): string;
    setAggDaCheckResultSignature(value: Uint8Array | string): BlockProof;
    clearStateCheckResultsList(): void;
    getStateCheckResultsList(): Array<StateCheckResult>;
    setStateCheckResultsList(value: Array<StateCheckResult>): BlockProof;
    addStateCheckResults(value?: StateCheckResult, index?: number): StateCheckResult;
    getAggStateCheckResultSignature(): Uint8Array | string;
    getAggStateCheckResultSignature_asU8(): Uint8Array;
    getAggStateCheckResultSignature_asB64(): string;
    setAggStateCheckResultSignature(value: Uint8Array | string): BlockProof;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BlockProof.AsObject;
    static toObject(includeInstance: boolean, msg: BlockProof): BlockProof.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BlockProof, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BlockProof;
    static deserializeBinaryFromReader(message: BlockProof, reader: jspb.BinaryReader): BlockProof;
}

export namespace BlockProof {
    export type AsObject = {
        txnBundleHash: string,
        txnBundleProposer: string,
        randomnessProof: Uint8Array | string,
        daCheckResultsList: Array<DACheckResult.AsObject>,
        aggDaCheckResultSignature: Uint8Array | string,
        stateCheckResultsList: Array<StateCheckResult.AsObject>,
        aggStateCheckResultSignature: Uint8Array | string,
    }
}

export class DACheckResult extends jspb.Message { 
    getTxnBundleHash(): string;
    setTxnBundleHash(value: string): DACheckResult;
    getRandomnessProof(): Uint8Array | string;
    getRandomnessProof_asU8(): Uint8Array;
    getRandomnessProof_asB64(): string;
    setRandomnessProof(value: Uint8Array | string): DACheckResult;
    getSignature(): Uint8Array | string;
    getSignature_asU8(): Uint8Array;
    getSignature_asB64(): string;
    setSignature(value: Uint8Array | string): DACheckResult;
    getSigner(): string;
    setSigner(value: string): DACheckResult;
    clearClaimsList(): void;
    getClaimsList(): Array<ClaimDACheckResult>;
    setClaimsList(value: Array<ClaimDACheckResult>): DACheckResult;
    addClaims(value?: ClaimDACheckResult, index?: number): ClaimDACheckResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DACheckResult.AsObject;
    static toObject(includeInstance: boolean, msg: DACheckResult): DACheckResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DACheckResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DACheckResult;
    static deserializeBinaryFromReader(message: DACheckResult, reader: jspb.BinaryReader): DACheckResult;
}

export namespace DACheckResult {
    export type AsObject = {
        txnBundleHash: string,
        randomnessProof: Uint8Array | string,
        signature: Uint8Array | string,
        signer: string,
        claimsList: Array<ClaimDACheckResult.AsObject>,
    }
}

export class StateCheckResult extends jspb.Message { 
    getTxnBundleHash(): string;
    setTxnBundleHash(value: string): StateCheckResult;
    getRandomnessProof(): Uint8Array | string;
    getRandomnessProof_asU8(): Uint8Array;
    getRandomnessProof_asB64(): string;
    setRandomnessProof(value: Uint8Array | string): StateCheckResult;
    getSignature(): Uint8Array | string;
    getSignature_asU8(): Uint8Array;
    getSignature_asB64(): string;
    setSignature(value: Uint8Array | string): StateCheckResult;
    getSigner(): string;
    setSigner(value: string): StateCheckResult;
    clearClaimsList(): void;
    getClaimsList(): Array<ClaimStateCheckResult>;
    setClaimsList(value: Array<ClaimStateCheckResult>): StateCheckResult;
    addClaims(value?: ClaimStateCheckResult, index?: number): ClaimStateCheckResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StateCheckResult.AsObject;
    static toObject(includeInstance: boolean, msg: StateCheckResult): StateCheckResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StateCheckResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StateCheckResult;
    static deserializeBinaryFromReader(message: StateCheckResult, reader: jspb.BinaryReader): StateCheckResult;
}

export namespace StateCheckResult {
    export type AsObject = {
        txnBundleHash: string,
        randomnessProof: Uint8Array | string,
        signature: Uint8Array | string,
        signer: string,
        claimsList: Array<ClaimStateCheckResult.AsObject>,
    }
}

export class ClaimDACheckResult extends jspb.Message { 
    getClaimHash(): string;
    setClaimHash(value: string): ClaimDACheckResult;
    getDataAvailable(): boolean;
    setDataAvailable(value: boolean): ClaimDACheckResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimDACheckResult.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimDACheckResult): ClaimDACheckResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimDACheckResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimDACheckResult;
    static deserializeBinaryFromReader(message: ClaimDACheckResult, reader: jspb.BinaryReader): ClaimDACheckResult;
}

export namespace ClaimDACheckResult {
    export type AsObject = {
        claimHash: string,
        dataAvailable: boolean,
    }
}

export class ClaimStateCheckResult extends jspb.Message { 
    getClaimHash(): string;
    setClaimHash(value: string): ClaimStateCheckResult;
    getStateCorrect(): boolean;
    setStateCorrect(value: boolean): ClaimStateCheckResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimStateCheckResult.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimStateCheckResult): ClaimStateCheckResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimStateCheckResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimStateCheckResult;
    static deserializeBinaryFromReader(message: ClaimStateCheckResult, reader: jspb.BinaryReader): ClaimStateCheckResult;
}

export namespace ClaimStateCheckResult {
    export type AsObject = {
        claimHash: string,
        stateCorrect: boolean,
    }
}

export class TransactionBundle extends jspb.Message { 
    getHeadBlockHash(): string;
    setHeadBlockHash(value: string): TransactionBundle;
    clearTransactionsList(): void;
    getTransactionsList(): Array<SignedTransaction>;
    setTransactionsList(value: Array<SignedTransaction>): TransactionBundle;
    addTransactions(value?: SignedTransaction, index?: number): SignedTransaction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TransactionBundle.AsObject;
    static toObject(includeInstance: boolean, msg: TransactionBundle): TransactionBundle.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TransactionBundle, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TransactionBundle;
    static deserializeBinaryFromReader(message: TransactionBundle, reader: jspb.BinaryReader): TransactionBundle;
}

export namespace TransactionBundle {
    export type AsObject = {
        headBlockHash: string,
        transactionsList: Array<SignedTransaction.AsObject>,
    }
}

export class BlockMetadata extends jspb.Message { 
    getCid(): string;
    setCid(value: string): BlockMetadata;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BlockMetadata.AsObject;
    static toObject(includeInstance: boolean, msg: BlockMetadata): BlockMetadata.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BlockMetadata, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BlockMetadata;
    static deserializeBinaryFromReader(message: BlockMetadata, reader: jspb.BinaryReader): BlockMetadata;
}

export namespace BlockMetadata {
    export type AsObject = {
        cid: string,
    }
}

export enum StakeType {
    DA_VERIFIER = 0,
    STATE_VERIFIER = 1,
}
