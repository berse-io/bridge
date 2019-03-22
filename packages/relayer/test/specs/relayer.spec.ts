
// receive emitted event on one chain
// route to another chain
// update the state root of another chain
// and then prove the event in the state

// THERE COULD be a race condition wherein the event makes it into the StateGadget AFTER the cross chain update
// ignoring this for now

// there could be another race condition
// whereby a chain updates its state twice
// and while we are going through the process of processBridgeEvents
// it constructs the wrong proof for the current state root
// so we need to make sure that it 

// if at one point it fails from callAsync
// then we retry
// with a 

describe('Relayer', async() => {
    it('routes interchain events correctly', async() => {
        
    })
})