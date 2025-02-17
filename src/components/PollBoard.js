import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { useEffect, useState } from "react";
import {
    Grid,
} from '@material-ui/core/'
import Button from '@mui/material/Button';
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import "./index.css";
import { useLocation } from "react-router-dom";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import {
    pollContract,
    selectAnOption,
    viewResult,
    getCurrentWalletConnected,
    checkPrevVote
} from "../util/interact.js"
import ResultModal from './ResultModal.js';
import CircularProgress from '@mui/material/CircularProgress';

const useStyles = makeStyles(theme => ({
    root: {
        flexGrow: 1,
        padding: theme.spacing(2)
    }
}))

export default function PollBoard() {
    const possibleSelection = ["DEFAULT", "A", "B", "C", "D", "E", "F", "G", "H"];
    let loc = useLocation();
    // for current page
    const [msg, setMsg] = useState("Hello Please Vote");
    const [pollID, setPollID] = useState(0);
    const [name, setName] = useState(0);
    const [description, setPollDescription] = useState("Please select a poll from the dashboard");
    const [data, setData] = useState([]);
    const [walletAddress, setWalletAddress] = useState("");

    // For pop up modal
    const [result, setResult] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = React.useState(false);

    useEffect(() => {
        async function fetchData() {
            const { address, status } = await getCurrentWalletConnected();
            if (typeof (status) == "string" && status.includes("Rejected")) {
                alert(status);
                location.href = "/";
            }
            if (loc.state !== undefined) {
                console.log("loc state is not undefined");
                console.log(loc.state);
                setPollID(loc.state.id);
                setName(loc.state.name);
                setPollDescription(loc.state.description);
                setData(loc.state.ops);
                setWalletAddress(address);
                setShowModal(false);
                //addSelectListener();
                //addViewResultListener();
                //addViewBlindResultFailListener();
                const prevVote = await checkPrevVote(address, loc.state.id);
                if (prevVote[0]) {
                    setMsg("You previously voted " + possibleSelection[prevVote[1]] + ", feel free to change your mind.");
                }
            } else {
                console.log("loc state undefined");
            }
        }
        fetchData();
    }, []);

    // Expected behavior: 1. gas fee. 2. select message update(for further functionality)
    const onSelectPressed = async (optionIndex) => {
        //alert("Option " + optionIndex + " Selected");
        let selection = optionIndex + 1;
        setMsg("You have selected " + possibleSelection[selection] + ", Please wait.");
        const res = await selectAnOption(walletAddress, pollID, selection);
        console.log(res);
        // setLoading(true);
        // if (typeof (res) === "string" && res.includes("rejected")) {
        //     setLoading(false);
        // }
        const choice = res[0];
        const isRevote = res[1];
        console.log("what");
        if (isRevote) { setMsg("🎉 You have re-voted " + possibleSelection[choice] + " successfully"); }
        else { setMsg("🎉 You have voted " + possibleSelection[choice] + " successfully"); }
    };


    // Expected behavior: 1. gas fee. 2. pop up window as triggered by the contract event
    const onViewResultsPressed = async () => { 
        const res = await viewResult(walletAddress, pollID);

        console.log(res);
        // setLoading(true);
        // console.log("onViewResultsPressed "+ typeof(res));
        // if(typeof(res) === "string" && res.includes("rejected")){
        //     setLoading(false);
        // }

        setLoading(false);
        if (res == "err") {
            console.log("error");
        } else {
            const isBlind = res.blind;
            const state = res.state;
            let resultMsg = "";
            if (isBlind) {
                resultMsg += "Blind ";
            } else {
                resultMsg += "Real time ";
            }
            if (state == 0) {
                resultMsg += "poll in progress. "
            } else {
                resultMsg += "poll ended. "
            }

            if (isBlind && state ==0) {
                resultMsg += " Come back later.";
            } else {
                const votingResult = res.result;
                const isTie = res.tie;
                if (isTie) {
                    resultMsg += "Tie Between options: ";
                    for (let i = 0; i < votingResult.length; i++) {
                        resultMsg += possibleSelection[votingResult[i]] + ", ";
                    }
                } else {
                    if (votingResult.length == 0) {
                        resultMsg += "No one voted.";
                    } else {
                        resultMsg += "Most participate voted: " + possibleSelection[votingResult[0]];
                    }
                }
            }
            setResult(resultMsg);
            setShowModal(true);
            console.log("Results logged successfully");
        }
    };



    const handleModalClose = () => {
        setShowModal(false);
    }

    const classes = useStyles()
    return (
        <div className={classes.root}>
            <div><ResultModal result={result} status={showModal} handleModalClose={handleModalClose} /></div>
            <Box sx={{ width: '100%', height: '100%' }}>
                <Stack spacing={2} height="40vh" >
                    <div id="one">{name}</div>
                    <span id="two">{description}  <br /><br />
                        {data.map(desc => (
                            <span>{desc}<br /></span>
                        ))}
                    </span>
                </Stack>
            </Box>
            <Grid
                container
                spacing={2}
                direction="row"
                justifyContent="flex-start"
                alignItems="flex-start"
                height="80vh"
            >
                <Grid container direction="row" alignItems="flex-start">
                    <Grid item xs={12} sm={6} md={6}>
                        <div className="c"> <Button onClick={onViewResultsPressed} style={{ fontSize: '1vw', color: '#778899' }}>View Results</Button> </div>
                    </Grid>
                    <Grid item xs={12} sm={6} md={6}>
                        <div className="c"> <Button ><Link to='/Dashboard' style={{ fontSize: '1vw', color: '#778899' }}> Back </Link></Button> </div>
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    <div className="c"> <Button variant="disabled" style={{ fontSize: '1rem' }}>{msg}</Button> </div>
                    <div>
                        {loading && <div><CircularProgress color="inherit" /><span className="spinningInfo">Information Retrieving in progress</span></div>}
                    </div>
                </Grid>
                {data.map(elem => (
                    <Grid item xs={12} sm={6} md={3} key={data.indexOf(elem)}>
                        <h1 className="cut-text-poll ">{elem}</h1>
                        <Button variant="outlined" id="selectButton" onClick
                            ={() => onSelectPressed(data.indexOf(elem))}
                            style={{ fontSize: '0.7rem' }}>Select</Button>
                    </Grid>
                ))}
            </Grid>
        </div>
    )
}