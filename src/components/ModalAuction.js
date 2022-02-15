import React, { useState } from 'react';
import { Modal, Input, Divider, Radio, DatePicker } from 'antd';

function ModalAuction(props) {
  const [price, setPrice] = useState(0);
  const [token, setToken] = useState('NEAR');

  function handleOk() {
    props.handleOk(token, price);
  }

  function handleTokenChange(e) {
    setToken(e.target.value);
  }

  return (
    <Modal
      title="Put your NFT on Auction"
      visible={props.visible}
      onOk={handleOk}
      onCancel={props.handleCancel}
      centered>
      <div style={{ marginBottom: 30 }}>
        <span style={{ marginBottom: 10, display: 'block' }}>
          Select token ({token}):
        </span>
        <Radio.Group value={token} onChange={handleTokenChange}>
          <Radio.Button value="NEAR">NEAR</Radio.Button>
        </Radio.Group>
      </div>
      <div>
        <span style={{ marginBottom: 10, display: 'block' }}>
          Start price ({token}):
        </span>
        <Input
          type={'number'}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={'ex: 1000 ...'}
          size="large"
        />
        <span>Time</span>
        <Input.Group compact>
          <Input style={{ width: '50%' }} defaultValue="input content" />
          <DatePicker style={{ width: '50%' }} />
        </Input.Group>
        <br />
        <Input.Group compact>
          <Input style={{ width: '30%' }} defaultValue="input content" />
          <DatePicker.RangePicker style={{ width: '70%' }} />
        </Input.Group>
      </div>
    </Modal>
  );
}

export default ModalAuction;
