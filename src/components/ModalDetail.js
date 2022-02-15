import React, { useState } from 'react';
import { Modal, Input, Divider, Radio } from 'antd';

function ModalDetail(props) {
    const [deposit, setDeposit] = useState(0);
    const [token, setToken] = useState('NEAR');
  
    function handleOk() {
      props.handleOk(token, deposit);
    }
  
    function handleTokenChange(e) {
      setToken(e.target.value);
    }
  return (
    <Modal
      title="Detail"
      visible={props.visible}
    //   onOk={handleOk}
      onCancel={props.handleCancel}
      footer={null}
      centered>
     <div style={{ marginBottom: 30 }}>
        <span style={{ marginBottom: 10, display: 'block' }}>
          Owner:
        </span>
        <span style={{ marginBottom: 10, display: 'block' }}>
          Title:
        </span>
        <span style={{ marginBottom: 10, display: 'block' }}>
          Description:
        </span>
        <span style={{ marginBottom: 10, display: 'block' }}>
          Media:
        </span>
        <span style={{ marginBottom: 10, display: 'block' }}>
          Token ID:
        </span>
      </div>
    </Modal>
  );
}

export default ModalDetail;
