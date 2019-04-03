#!/usr/bin/env bash

echo removing old devChain

rm -rf devChain

echo initialising new blockchain with genesis file

geth --datadir=devChain init genesis_dev.json

echo copying utc file to keystore

cp utc ./devChain/keystore/utc