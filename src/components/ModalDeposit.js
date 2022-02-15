import React, { useState } from 'react';
import { Modal, Input, Divider, Radio } from 'antd';

function ModalDeposit(props) {
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
      title="Deposit Storage"
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
          Deposit: 0.1 {token}
        </span>
        
      </div>
    </Modal>
  );
}

export default ModalDeposit;
