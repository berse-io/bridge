cd packages/multichain

yarn clean
yarn start run --chain ethereum --name kovan &
CHAIN_1=$!
yarn start run --chain ethereum --name rinkeby &
CHAIN_2=$!

cd ../deployer
sleep 2
yarn deploy:testnets

trap 'pkill -P $$' SIGING SIGTERM EXIT
read