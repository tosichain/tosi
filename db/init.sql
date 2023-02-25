CREATE TABLE main (
    `k` varchar(64) primary key,
    `val` LONGBLOB
);


CREATE TABLE state (
    `k` varchar(64) primary key,
    `val` LONGBLOB
);

CREATE TABLE mempool (
    `k` varchar(64) primary key,
    `val` LONGBLOB
);

CREATE TABLE blockMeta (
    `k` varchar(64) primary key,
    `val` LONGBLOB
);

CREATE TABLE block (
    `k` varchar(64) primary key,
    `val` LONGBLOB
);