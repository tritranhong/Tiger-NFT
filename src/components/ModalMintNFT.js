import 'regenerator-runtime/runtime';

import React, { useState } from 'react';
import {
  Modal,
  Input,
  Divider,
  Upload,
  Button,
  InputNumber,
  Row,
  Col,
  Card,
  Message,
} from 'antd';
import { red } from 'bn.js';
import TextArea from 'antd/lib/input/TextArea';
import { InboxOutlined } from '@ant-design/icons';
const { Dragger } = Upload;

function ModalMintNFT(props) {
  const [tokenId, setTokenId] = useState('');
  const [tokenTitle, setTokenTitle] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState('');
  const [royalty, setRoyalty] = useState('');

  function handleOk() {
    props.handleOk({
      tokenId,
      tokenTitle,
      description,
      media,
      royalty,
    });
  }
  const { Meta } = Card;
  return (
    <Modal
      title="Mint NFT"
      visible={props.visible}
      onOk={handleOk}
      onCancel={props.handleCancel}
      width={'80%'}
      centered={'true'}
      bodyStyle={{ height: 'fit-content' }}>
      <Row>
        <Col span={12}>
          <span>Token Id:</span>
          <Input
            onChange={(e) => setTokenId(e.target.value)}
            style={{ marginBottom: 15 }}
          />
          <span>Title:</span>
          <Input
            onChange={(e) => setTokenTitle(e.target.value)}
            style={{ marginBottom: 15 }}
          />
          <span>Description:</span>
          <TextArea
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginBottom: 15, height: 150 }}
          />
          <span>Upload Your Media:</span>
          <br></br>

          <Upload
            listType="picture"
            onChange={(e) => setMedia(e.target.value)}
            style={{ marginBottom: 15 }}>
            <Button>Here</Button>
          </Upload>
          <span>External Link:</span>

          <Input
            onChange={(e) => setMedia(e.target.value)}
            style={{ marginBottom: 15 }}
          />
          <span>Royalties rates:</span>
          <br></br>
          <InputNumber
            addonAfter="%"
            defaultValue={10}
            max={100}
            onChange={(e) => setRoyalty(e.target.value)}
          />
        </Col>
        <Col span={12} style={{ display: 'flex', justifyContent: 'center' }}>
          <Card
            title={`@${window.accountId}`}
            hoverable
            style={{ width: 300, borderRadius: 15 }}
            cover={
              <img
                style={{
                  width: 300,
                  height: 300,
                  color: 'white',
                  backgroundColor: 'black',
                }}
                alt="Please add Media to mint your NFT"
                src={
                  media ||
                  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXcWU0FHMJbdT4j9k35BzszltwEfGx78Sm8w&usqp=CAU'
                }
              />
            }>
            <Meta
              style={{ overflow: 'hidden', height: 80 }}
              title={tokenTitle || 'Title'}
              description={description || 'Description'}
            />
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}

export default ModalMintNFT;
