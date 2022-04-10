import React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import { CardActions } from 'material-ui';
import { DatePicker } from 'antd';
import { Form, Input, Select, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 4 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 20 },
  },
};
const formItemLayoutWithOutLabel = {
  wrapperCol: {
    xs: { span: 24, offset: 0 },
    sm: { span: 20, offset: 4 },
  },
};

import PollCreationModal from './PollCreationModal.js';
import { useEffect, useState } from "react";
import {
  pollContract,
  createFakeEvent,
  getCurrentWalletConnected
} from "../util/interact.js"

export default function AddressForm() {

    const [walletAddress, setWallet] = useState();
    const [showModal, setShowModal] = useState(false);
    useEffect(() => { 
      addNewEventCreatedListener();
      async function fetchData() {  
        const { address, status } = await getCurrentWalletConnected();
        console.log(address);
        setWallet(address);
      }
      fetchData();
    }, []);

    function createNewElement() {
        // First create a DIV element.
        var txtNewInputBox = document.createElement('div');
    
        // Then add the content (a new input box) of the element.
        txtNewInputBox.innerHTML = "<input type='text' id='newInputBox'>";
    
        // Finally put it where it is supposed to appear.
        document.getElementById("newElementId").appendChild(txtNewInputBox);
    }
    const onCreatePollPressed = async() => {
      console.log("onCreatePollPressed");
      console.log(walletAddress);
      var num = document.getElementById("numberofChoice").value;
      console.log(num);
      for (let i = 0; i < num; ++i){
          console.log(i);
      }
      // TODO: Change into real options instead of fake ones

      const pollName = document.getElementById("pollName").value;
      const pollDescription = document.getElementById("pollDescription").value;
      const pollDuration = document.getElementById("pollDuration").value * 60;
      const isBlind = document.getElementById("blindVote").checked;
      const isAboutDao = document.getElementById("aboutDao").checked;
      const options = [1, 2, 3];
      const optionDescription = ["A", "B", "C"];
      await createFakeEvent(walletAddress, pollName, pollDescription, pollDuration, isBlind, isAboutDao, options, optionDescription);
      // const { status2 } = await createFakeEvent(address, walletAddress, pollName, pollDescription,pollDuration, isBlind, isAboutDao, options, optionDescription);
      // setStatus(status2);
      console.log("on create poll finished");
      // console.log(status2);
      // const { status } = await viewAnEvent(walletAddress, pollID);
    };

    // return a poll object polls[pollId]
    // Should work as just to display the error message
    function addNewEventCreatedListener() {
      console.log("addNewEventCreatedListener");
      pollContract.events.pollCreated({}, (error, data) => {
          console.log("entered addNewEventCreatedListener");
          if (error) {
              console.log("created failed with error" + error);
              alert("Error message: " + error);
          } else {
              setShowModal(true);
              console.log("created successfully");
              console.log(data.returnValues); // TODO: Print this into warning or modal 
          }
      });
    }

    const [form] = Form.useForm();
    var keyArray = [];
    var valueArray = [];

    const onFinish = values => {
      let s = values["choice"].length;
      for (let i = 0; i < s; ++i){
        keyArray.push(values["choice"][i].first);
        valueArray.push(values["choice"][i].last);
      }
      alert("Choice Submitted");
      localStorage.setItem("keyArray", keyArray);
      localStorage.setItem("valueArray", valueArray);
      keyArray = [];
      valueArray = [];
    };

    const handleChange = () => {
      form.setFieldsValue({ sights: [] });
    };


    const handleModalClose = () => {
      setShowModal(false);
    } 

  return (
    <React.Fragment>
      <div><PollCreationModal status={showModal} handleModalClose={handleModalClose}/></div>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="pollName"
            name="pollName"
            label="Poll Name"
            fullWidth
            autoComplete="given-name"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="pollDuration"
            name="pollDuration"
            label="Poll Duration (in minutes)"
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            id="pollDescription"
            name="pollDescription"
            label="Poll Description"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          Blind Vote <input type = "checkbox" id = "blindVote"/> 
        </Grid>
        <Grid item xs={12} sm={6}>
          About DAO or Not<input type = "checkbox" id = "aboutDao"/> 
          {/* <Select
            // value={value.currency || currency}
            // style={{ width: 80, margin: '0 8px' }}
            // onChange={onCurrencyChange}
          >
            <Option value="rmb">RMB</Option>
            <Option value="dollar">Dollar</Option>
          </Select> */}
        </Grid>
        
        <Grid item xs={12} sm={12}>
          <Form name="dynamic_form_nest_item" onFinish={onFinish} autoComplete="off" align = "center">
            <Form.List name="choice">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'first']}
                        rules={[{ required: true, message: 'Missing key value' }]}
                      >
                        <Input placeholder="Choice Key" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'last']}
                        rules={[{ required: true, message: 'Missing key description' }]}
                      >
                        <Input placeholder="Description" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add field
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
            </Form.Item>
          </Form>
          </Grid>
        <Grid item xs={12} sm={6}>
        <label>
            Number of Choices:
            <input type="text" id = "numberofChoice" pattern="[0-9]*"/>
        </label>
        <button onClick={() => onCreatePollPressed()}> Submit2 </button>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}