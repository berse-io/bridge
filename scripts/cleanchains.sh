cd packages/multichain

lsof -ti:10000 | xargs kill -9
lsof -ti:10001 | xargs kill -9

trap 'pkill -P $$' SIGINT SIGTERM EXIT

echo Starting chains
yarn clean
yarn start run --chain ethereum --name kovan &
CHAIN_1=$!
yarn start run --chain ethereum --name rinkeby &
CHAIN_2=$!


cd ../deployer
sleep 3
echo Deploying
yarn deploy:testnets

read