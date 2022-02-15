import React, { useEffect, useState } from 'react';
import { Button, Card, PageHeader, notification, Row, Col } from 'antd';
import {
  SendOutlined,
  DollarCircleOutlined,
  EllipsisOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import ModalTransferNFT from '../components/ModalTransferNFT';
import ModalSale from '../components/ModalSale';
import { default as PublicKey, transactions, utils } from 'near-api-js';
import { functionCall, createTransaction } from 'near-api-js/lib/transaction';
import ModalMintNFT from '../components/ModalMintNFT';
import { login, parseTokenAmount } from '../utils';
import BN from 'bn.js';
import { baseDecode } from 'borsh';
import getConfig from '../config';
import ModalDeposit from '../components/ModalDeposit';
import ModalAuction from '../components/ModalAuction';
import ModalDetail from '../components/ModalDetail';

const nearConfig = getConfig(process.env.NODE_ENV || 'development');
const { Meta } = Card;

function Profile() {
  const [nfts, setNFTs] = useState([]);
  const [transferVisible, setTransferVisible] = useState(false);
  const [saleVisible, setSaleVisible] = useState(false);
  const [mintVisible, setMintVisible] = useState(false);
  const [auctionVisible, setAuctionVisible] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);
  const [depositVisible, setDepositVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(async () => {
    if (window.accountId) {
      let data = await window.contractNFT.nft_tokens_for_owner({
        account_id: window.accountId,
        from_index: '0',
        limit: 10,
      });
      console.log('Data: ', data);
      setNFTs(data);
    }
  }, []);

  function handleTransferToken(token) {
    setCurrentToken(token);

    setTransferVisible(true);
  }

  function getGas(gas) {
    return gas ? new BN(gas) : new BN('100000000000000');
  }
  function getAmount(amount) {
    return amount ? new BN(utils.format.parseNearAmount(amount)) : new BN('0');
  }

  function handleSaleToken(token) {
    setCurrentToken(token);

    setSaleVisible(true);
  }

  function handleAuctionToken(token) {
    setCurrentToken(token);
    setAuctionVisible(true);
  }

  async function submitTransfer(accountId, tokenId) {
    try {
      if (accountId && currentToken.token_id) {
        await window.contractNFT.nft_transfer(
          {
            receiver_id: accountId,
            token_id: currentToken.token_id,
            approval_id: 0,
            memo: 'Transfer to ' + accountId,
          },
          30000000000000,
          1
        );
        setTransferVisible(false);
      }
    } catch (e) {
      console.log('Transfer error: ', e);
      setTransferVisible(false);
    } finally {
      setTransferVisible(false);
    }
  }

  async function createTransactionA({ receiverId, actions, nonceOffset = 1 }) {
    const localKey = await this.connection.signer.getPublicKey(
      this.accountId,
      this.connection.networkId
    );
    let accessKey = await this.accessKeyForTransaction(
      receiverId,
      actions,
      localKey
    );
    if (!accessKey) {
      throw new Error(
        `Cannot find matching key for transaction sent to ${receiverId}`
      );
    }

    const block = await this.connection.provider.block({ finality: 'final' });
    const blockHash = baseDecode(block.header.hash);

    const publicKey = PublicKey.from(accessKey.public_key);
    const nonce = accessKey.access_key.nonce + nonceOffset;

    return createTransaction(
      this.accountId,
      publicKey,
      receiverId,
      nonce,
      actions,
      blockHash
    );
  }

  async function executeMultiTransactions(transactions, callbackUrl) {
    const nearTransactions = await Promise.all(
      transactions.map((t, i) => {
        return createTransactionA({
          receiverId: t.receiverId,
          nonceOffset: i + 1,
          actions: t.functionCalls.map((fc) =>
            functionCall(
              fc.methodName,
              fc.args,
              getGas(fc.gas),
              getAmount(fc.amount)
            )
          ),
        });
      })
    );

    return window.walletConnection.requestSignTransactions(nearTransactions);
  }

  async function submitOnSale(token, price) {
    try {
      if (price && currentToken.token_id) {
        let sale_conditions =
          token === 'NEAR'
            ? {
                is_native: true,
                contract_id: 'near',
                decimals: '24',
                amount: utils.format.parseNearAmount(price.toString()),
              }
            : {
                is_native: false,
                contract_id: window.contractFT.contractId,
                decimals: '18',
                amount: parseTokenAmount(price, 18).toLocaleString('fullwide', {
                  useGrouping: false,
                }),
              };

        // Check storage balance
        let storageAccount = await window.contractMarket.storage_balance_of({
          account_id: window.accountId,
        });

        // Submit sale
        if (storageAccount > 0) {
          console.log(
            'Data: ',
            storageAccount,
            utils.format.parseNearAmount('0.1'),
            nearConfig.marketContractName
          );
          await window.contractNFT.nft_approve(
            {
              token_id: currentToken.token_id,
              account_id: nearConfig.marketContractName,
              msg: JSON.stringify({ sale_conditions }),
            },
            30000000000000,
            utils.format.parseNearAmount('0.01')
          );
          setSaleVisible(false);
        } else {
          notification['warning']({
            message: 'Không đủ Storage Balance',
            description:
              'Storage Balance của bạn không đủ để đăng bán NFT mới. Vui lòng nạp thêm!',
          });
        }
      }
    } catch (e) {
      console.log('Transfer error: ', e);
      setTransferVisible(false);
    } finally {
      setTransferVisible(false);
    }
  }
  async function submitOnDeposit(data) {
         
     await window.contractMarket.storage_deposit(
       {
         account_id: window.accountId,
       },
       30000000000000,
       utils.format.parseNearAmount('0.1')
     )
  }

  async function submitOnMint(data) {
    // call NFT contract mint_token
    if (data.tokenId && data.media) {
      try {
        await window.contractNFT.nft_mint(
          {
            token_id: data.tokenId,
            receiver_id: window.accountId,
            metadata: {
              title: data.tokenTitle,
              description: data.description,
              media: data.media.contract
            },
          },
          30000000000000,
          utils.format.parseNearAmount('0.01')
        );
      } catch (e) {
        console.log('Error: ', e);
      }
    }
  }

  function handleClickMint() {
    if (window.walletConnection.isSignedIn()) {
      setMintVisible(true);
    } else {
      login();
    }
  }

  function handleClickDeposit() {
    if (window.walletConnection.isSignedIn()) {
      setDepositVisible(true);
    } else {
      login();
    }
  }

  function handleClickDetail() {
    if (window.walletConnection.isSignedIn()) {
      setDetailVisible(true);
    } else {
      login();
    }
  }

  function handleClickAuction() {
    if (window.walletConnection.isSignedIn()) {
      setAuctionVisible(true);
    }else {
      login();
    }
  }
  async function handleRemoveSale (data) {
    console.log(data)
    await window.contractMarket.remove_sale({
      nft_contract_id: data.nft_contract_id,
      token_id: data.token_id,
    },
    30000000000000,
    utils.format.parseNearAmount('0.01')
    );
  }

  return (
    <div>
      <PageHeader
        className="site-page-header"
        title="My Collectibles"
        extra={[
          <Button
            onClick={handleClickMint}
            key="3"
            style={{ borderRadius: 15 }}>
            Create Your Own NFT
          </Button>,
          <Button
            onClick={handleClickDeposit}
            key="4"
            style={{ borderRadius: 15 }}>
            Deposit Storage
          </Button>,
        ]}
      />
      <Row style={{ padding: 30, justifyContent: 'space-evenly' }}>
        {nfts.map((item) => {
          return (
            <Col>
              <Card
                key={item.token_id}
                hoverable
                style={{
                  width: 360,
                  marginBottom: 30,
                  borderRadius: 15,
                  overflow: 'hidden',
                }}
                cover={
                  <img
                onClick ={handleClickDetail}

                    style={{ height: 300, width: 360, objectFit: 'contain' }}
                    alt="nft-cover"
                    src={item.metadata.media}
                  />
                }
                actions={[
                  <Button
                    style={{ minWidth: 80 }}
                    onClick={() => handleTransferToken(item)}
                    key={'send'}>
                      {    
                    item.approved_account_ids[nearConfig.marketContractName] >=
                    0
                      ? ''
                      : 'Transfer'
                    }
                  </Button>,
                  <Button
                    style={{ minWidth: 80 }}
                    onClick={() => handleSaleToken(item)}
                    key={'sell'}>
                    {    
                    item.approved_account_ids[nearConfig.marketContractName] >=
                    0
                      ? 'Update Price'
                      : 'Sell'
                    }
                
                  </Button>,

                  
                  <Button
                    style={{ minWidth: 80 }}
                    onClick={item.approved_account_ids[nearConfig.marketContractName] >=
                      0
                        ? () => handleRemoveSale(item)
                        : () => handleAuctionToken(item)
                      }
                    key={'auction'}>
                    {    
                    item.approved_account_ids[nearConfig.marketContractName] >=
                    0
                      ? ''
                      : 'Auction'
                    }
                  </Button>,
                ]}>
                <Meta
                  style={{ overflow: 'hidden', height: 80 }}
                  title={`${item.metadata.title} (${
                    item.approved_account_ids[nearConfig.marketContractName] >=
                    0
                      ? 'On Sale'
                      : ''
                  })`}
                  description={`
                    ${item.metadata.description}
                  `}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
      <ModalTransferNFT
        visible={transferVisible}
        handleOk={submitTransfer}
        handleCancel={() => setTransferVisible(false)}
      />
      <ModalSale
        visible={saleVisible}
        handleOk={submitOnSale}
        handleCancel={() => setSaleVisible(false)}
      />
      <ModalAuction
        visible={auctionVisible}
        // handleOk={submitOnAuction}
        handleCancel={() => setAuctionVisible(false)}
      />
      <ModalMintNFT
        visible={mintVisible}
        handleOk={submitOnMint}
        handleCancel={() => setMintVisible(false)}
      />
      <ModalDeposit
        visible={depositVisible}
        handleOk={submitOnDeposit}
        handleCancel={() => setDepositVisible(false)}
      />
      <ModalDetail
      visible={detailVisible}
      handleCancel={() => setDetailVisible(false)}
      ></ModalDetail>
     
    
    </div>
  );
}

export default Profile;
