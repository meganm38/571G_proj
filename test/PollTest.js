const {expect, assert} = require("chai");
const BigNumber = require('big-number');
const { ethers } = require("hardhat");

describe("Poll", function() {
    let pollContract;
    let deployedPoll;
    let pollCreator;
    let participant1;
    let participant2;
    let participant3;
    let availableSelections;
    const pollDuration = 10;

    beforeEach(async function() {
        pollContract = await ethers.getContractFactory("Poll");
        deployedPoll = await pollContract.deploy();
        [pollCreator, participant1, participant2, participant3] = await ethers.getSigners();
        availableSelections = [1, 2];

    });

    describe("Participant Registration", function() {
        it("1. Unsuccessful registration if name is empty.", async function() {
            await expect(deployedPoll.connect(participant1).registerParticipant("",{value: "100000000000000000"})).to.be.revertedWith(
                "Participant name is empty");
        });
    
        it("2. Unsuccessful registration if registration price is not paid in the exact amount.", async function() {
            //1e16
            await expect(deployedPoll.connect(participant1).registerParticipant("Monica", {value: "10000000000000000"})).to.be.revertedWith(
                "Asset not enough to register");
            //1e18
            await expect(deployedPoll.connect(participant1).registerParticipant("Monica", {value: "1000000000000000000"})).to.be.revertedWith(
                "Amount sent not equal to the registration price");
        });
    
        it("3. Successful registration if a first-time participate provides non-empty name and enough registration fee.", async function() {
            //1e17
            await deployedPoll.connect(participant1).registerParticipant("Monica", {value: "100000000000000000"});

            expect(await deployedPoll.numberOfParticipant()).to.equal(1);

            expect(await deployedPoll.participantName("Monica")).to.equal(await participant1.address);
        });
    
        it("4. Successful payment of registration fee after registeration", async function() {
            const balanceBefore = BigNumber(await participant1.getBalance() + "");

            const tx = await deployedPoll.connect(participant1).registerParticipant("Monica", {value: "100000000000000000"});
            const receipt = await tx.wait();
            const gas = await receipt.gasUsed;
            const gasFee = BigNumber(gas + "").multiply(BigNumber(tx.gasPrice + ""));

            const balanceAfter = BigNumber(await participant1.getBalance() + "");
            
            const string1 = balanceBefore.subtract(balanceAfter).subtract(BigNumber("100000000000000000")) + "";
            assert.equal(string1, gasFee + "");
        });

        it("5. Unsuccessful registration if already registered.", async function() {
            //1e17
            await deployedPoll.connect(participant1).registerParticipant("Monica", {value: "100000000000000000"});

            await expect(deployedPoll.connect(participant1).registerParticipant("Monica", {value: "100000000000000000"})).to.be.revertedWith(
                "Participant already registered");

            expect(await deployedPoll.numberOfParticipant()).to.equal(1);
        });

        it("6. Non-registered participant doesn't exist in poll.", async function() {
            await expect(deployedPoll.connect(participant1).lookUpParticipant("Rachel")).to.be.revertedWith(
                "Can't find the name in all participants");
        });
    });

    describe("New Poll Creation", function() {
        it("1. Unsuccessful creation if poll name or discription is empty.", async function() {
            await expect(deployedPoll.connect(pollCreator).createPoll("", "Test poll", 10, true, true, availableSelections)).to.be.revertedWith(
                "Poll name is empty");

            await expect(deployedPoll.connect(pollCreator).createPoll("Poll", "", 10, true, true, availableSelections)).to.be.revertedWith(
                "Poll description is empty");
        });

        it("2. Unsuccessful creation if duration is not larger than 0.", async function() {
            await expect(deployedPoll.connect(pollCreator).createPoll("Poll", "Test poll", 0, true, true, availableSelections)).to.be.revertedWith(
                "Poll duration is empty");
        });       

        it("3. Unsuccessful creation if available choices are not provided.", async function() {
            await expect(deployedPoll.connect(pollCreator).createPoll("Poll", "Test poll", 10, true, true, [])).to.be.revertedWith(
                "Choice to select from not given");
        }); 

        it("4. Unsuccessful creation if available choices are outside of Selection enum.", async function() {
            // https://github.com/NomicFoundation/hardhat/issues/1227
            // Other exception was thrown: Error: Transaction reverted: function was called with incorrect parameters
            // dispite having a require statement that throws "Input choice not valid"
            await expect(deployedPoll.connect(pollCreator).createPoll("Poll", "Test poll", 10, true, true, [7])).to.be.reverted;
        });         

        it("5. Unsuccessful creation if poll creator is not registered.", async function() {
            await expect(deployedPoll.connect(pollCreator).createPoll("Poll", "Test poll", 10, true, true, availableSelections)).to.be.revertedWith(
                "Participant not registered in the system");
        });

        it("6. Successful creation if all requirements are met.", async function() {
            await deployedPoll.connect(pollCreator).registerParticipant("Ross", {value: "100000000000000000"});
            await deployedPoll.connect(pollCreator).createPoll("Poll", "Test poll", 10, true, true, availableSelections);

            // A single poll has been created
            let allPolls = await deployedPoll.connect(pollCreator).viewAllPolls();
            expect(allPolls.length).to.equal(1);

            let singlePoll = allPolls[0];
            
            // Test created poll attributes
            expect (singlePoll.state).to.equal(0);
            expect(singlePoll.pollId).to.equal(1);
            expect(singlePoll.name).to.equal("Poll");
            expect(singlePoll.description).to.equal("Test poll");
            expect(singlePoll.votingDuration).to.equal(10);
            expect(singlePoll.blind).to.equal(true);
            expect(singlePoll.aboutDAO).to.equal(true);
            expect(singlePoll.choseFrom).to.eql(availableSelections);
            expect(singlePoll.blind).to.equal(true);
            expect(singlePoll.totalVote).to.equal(0);
            expect(singlePoll.voted).to.eql([]);
            expect(singlePoll.votedChoices).to.eql([]);
            expect(singlePoll.result).to.eql([]);
            expect(singlePoll.tie).to.equal(false);
        });
    });

    describe("Poll Voting: voting is not blind", function() {

        beforeEach(async function() {
            
            await deployedPoll.connect(pollCreator).registerParticipant("Ross", {value: "100000000000000000"});
            await deployedPoll.connect(participant1).registerParticipant("Monica", {value: "100000000000000000"});
            await deployedPoll.connect(pollCreator).createPoll("Poll", "Test poll", pollDuration, false, true, availableSelections);
        });

        describe("Checking results before anyone votes", function() {
            it("1. Cannot view result of non-existent poll", async function() {
                await expect(deployedPoll.connect(participant1).viewResult(2)).to.be.revertedWith("Poll not created");
            });
    
            it("2. Result should be DEFAULT (i.e. 0) when no one has voted", async function() {
                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false, [], 0, false);
            });
        });

        describe("Voting and checking results when poll is still in progress.", function() {
            it("1. Cannot vote at a non-existent poll", async function() {
                await expect(deployedPoll.connect(participant1).vote(2, 1)).to.be.revertedWith("Poll not created");
            });

            it("2. Unsuccessful voting if participant has not registered.", async function () {
                await expect(deployedPoll.connect(participant2).vote(1, 1)).to.be.revertedWith("Participant not registered in the system");
            });

            it("3. Successful voting at a poll if participant has registered.", async function() {
                let pollCreatedTime = Date.now();

                await deployedPoll.connect(participant1).vote(1, 1);
                
                // Confirm poll has not ended
                let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test successful voting but voting period has ended");
            });

            it("4. Correct voting result after one participant voted.", async function() {
                let pollCreatedTime = Date.now();

                await deployedPoll.connect(participant1).vote(1, 1);
                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[1], 0, false);

                // Confirm poll has not ended
                let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test successful voting but voting period has ended");            
            });

            it("5. Correct voting result if mutiple voting options received equal number of votes.", async function() {
                let pollCreatedTime = Date.now();

                await deployedPoll.connect(participant1).vote(1, 1);
                await deployedPoll.connect(participant2).registerParticipant("Rachel", {value: "100000000000000000"});
                await deployedPoll.connect(participant2).vote(1, 2);

                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(true,[1, 2], 0, false);

                // Confirm poll has not ended
                let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test successful voting but voting period has ended");            
            });

            it("6. Correct voting result if one voting option recieved more votes than others.", async function() {
                let pollCreatedTime = Date.now();

                await deployedPoll.connect(participant2).registerParticipant("Rachel", {value: "100000000000000000"});
                await deployedPoll.connect(participant3).registerParticipant("Joey", {value: "100000000000000000"});
                await deployedPoll.connect(participant1).vote(1, 1);
                await deployedPoll.connect(participant2).vote(1, 2);
                await deployedPoll.connect(participant3).vote(1, 2);

                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[2], 0, false);
                // Confirm poll has not ended
                let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test successful voting but voting period has ended");    
            });

            it("7. Correct dynamic results with participants changing votes", async function() {
                let pollCreatedTime = Date.now();

                await deployedPoll.connect(participant2).registerParticipant("Rachel", {value: "100000000000000000"});
                await deployedPoll.connect(participant3).registerParticipant("Joey", {value: "100000000000000000"});
                await deployedPoll.connect(participant1).vote(1, 1);
                await deployedPoll.connect(participant2).vote(1, 2);
                await deployedPoll.connect(participant3).vote(1, 2);

                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[2], 0, false);

                await deployedPoll.connect(participant1).vote(1, 2);
                await deployedPoll.connect(participant2).vote(1, 1);
                await deployedPoll.connect(participant3).vote(1, 1);

                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[1], 0, false);


                await deployedPoll.connect(participant2).vote(1, 2);
                console.log("Actual Time", Date.now()/ 1000);

                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[2], 0, false);

                // Confirm poll has not ended
                let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test successful voting but voting period has ended");    
            });
        });

        describe("Voting and checking results after poll has ended", function() {
            it("1. Unsuccessful voting if poll has ended. No one voted.", async function() {
                let pollCreatedTime = Date.now();
                
                await new Promise(r => setTimeout(r, pollDuration * 1000));

                // Confirm poll has now ended
                let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isAtLeast(timeElapsedInSeconds, pollDuration, "Trying to test unsuccessful voting due to poll ending but poll didn't end");

                await expect(deployedPoll.connect(participant1).vote(1, 1)).to.be.revertedWith("Vote time has passed");
                await expect(deployedPoll.connect(participant1).vote(1, 1)).to.be.revertedWith("The poll has ended");
                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[], 1, false);
            });

            it("1. Correct final results after poll has ended.", async function() {
                let pollCreatedTime = Date.now();
                
                await deployedPoll.connect(participant2).registerParticipant("Rachel", {value: "100000000000000000"});
                await deployedPoll.connect(participant3).registerParticipant("Joey", {value: "100000000000000000"});
                await deployedPoll.connect(participant1).vote(1, 1);
                await deployedPoll.connect(participant2).vote(1, 2);
                await deployedPoll.connect(participant3).vote(1, 2);

                // Confirm poll is still in progress
                let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test successful voting but voting period has ended");   

                await new Promise(r => setTimeout(r, pollDuration * 1000));

                // Confirm poll has now ended
                timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
                assert.isAtLeast(timeElapsedInSeconds, pollDuration, "Trying to test unsuccessful voting due to poll ending but poll didn't end");

                await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[2], 1, false);
            });
        });
    });

    describe("Poll Voting: voting is blind", function() {
        
        beforeEach(async function() {
            await deployedPoll.connect(pollCreator).registerParticipant("Ross", {value: "100000000000000000"});
            await deployedPoll.connect(participant1).registerParticipant("Monica", {value: "100000000000000000"});
            await deployedPoll.connect(participant2).registerParticipant("Rachel", {value: "100000000000000000"});
            await deployedPoll.connect(participant3).registerParticipant("Joey", {value: "100000000000000000"});
            await deployedPoll.connect(pollCreator).createPoll("Poll", "Test poll", pollDuration, true, true, availableSelections);
        });

        it("1. Cannot view result of non-existent poll.", async function() {
            await expect(deployedPoll.connect(participant1).viewResult(2)).to.be.revertedWith("Poll not created");
        });

        it("2. Cannot view result if voting is still in progress.", async function() {
            let pollCreatedTime = Date.now();
            
            await deployedPoll.connect(participant1).vote(1, 1);
            await deployedPoll.connect(participant2).vote(1, 2);
            await deployedPoll.connect(participant3).vote(1, 2);
            
            expect(deployedPoll.connect(pollCreator).viewResult(1)).to.be.revertedWith("This voting is blind, result not revealed yet");

            // Confirm poll is still in progress
            let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
            assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test unsuccessful results lookup but poll has ended");   
        });

        it("3. Correct results if voting has ended and no one can vote anymore.", async function() {
            let pollCreatedTime = Date.now();
                
            await deployedPoll.connect(participant1).vote(1, 1);
            await deployedPoll.connect(participant2).vote(1, 2);
            await deployedPoll.connect(participant3).vote(1, 2);

            // Confirm poll is still in progress
            let timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;
            assert.isBelow(timeElapsedInSeconds, pollDuration, "Trying to test successful voting but voting period has ended");   

            await new Promise(r => setTimeout(r, pollDuration * 1000));

            // Confirm poll has now ended
            timeElapsedInSeconds = (Date.now() - pollCreatedTime) / 1000;

            assert.isAtLeast(timeElapsedInSeconds, pollDuration, "Trying to look up results after poll has ended but poll didn't end");

            await expect(deployedPoll.connect(participant1).viewResult(1)).to.emit(deployedPoll, 'resultViewed').withArgs(false,[ 2 ], 1, true);

            await expect(deployedPoll.connect(participant1).vote(1, 2)).to.be.revertedWith("The poll has ended");
        })
    });
});