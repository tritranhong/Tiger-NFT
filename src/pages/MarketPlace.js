import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  PageHeader,
  notification,
  Row,
  Col,
  Breadcrumb,
  Modal,
} from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { utils, transactions } from 'near-api-js';
import { login, parseTokenWithDecimals } from '../utils';
import { functionCall } from 'near-api-js/lib/transaction';

const { Meta } = Card;

function MarketPlace() {
  const [data, setData] = useState([]);
  const [tokenList, setTokenList] = useState([]);

  async function handleBuy(item) {
    console.log(item);

    try {
      if (!window.walletConnection.isSignedIn()) return login();

      if (item.sale_conditions.is_native) {
        let nearBalance = await window.account.getAccountBalance();
        if (nearBalance.available < parseInt(item.sale_conditions.amount)) {
          notification['warning']({
            message: 'Số dư NEAR không đủ',
            description: 'Tài khoản của bạn không đủ số dư để mua NFT!',
          });

          return;
        }

        await window.contractMarket.offer(
          {
            nft_contract_id: item.nft_contract_id,
            token_id: item.token_id,
            description: item.description,
          },
          300000000000000,
          item.sale_conditions.amount
        );
      } else {
        // Check balance
        let vbicBalance = await window.contractFT.ft_balance_of({
          account_id: window.accountId,
        });
        if (vbicBalance < parseInt(item.sale_conditions.amount)) {
          notification['warning']({
            message: 'Số dư VBIC không đủ',
            description: 'Tài khoản của bạn không đủ số dư để mua NFT!',
          });

          return;
        }

        // Handle storage deposit
        let message = {
          nft_contract_id: window.contractNFT.contractId,
          token_id: item.token_id,
        };
        const result = await window.account.signAndSendTransaction({
          receiverId: window.contractFT.contractId,
          actions: [
            transactions.functionCall(
              'storage_deposit',
              { account_id: item.owner_id },
              10000000000000,
              utils.format.parseNearAmount('0.01')
            ),
            transactions.functionCall(
              'ft_transfer_call',
              {
                receiver_id: window.contractMarket.contractId,
                amount: item.sale_conditions.amount,
                msg: JSON.stringify(message),
              },
              250000000000000,
              '1'
            ),
          ],
        });

        console.log('Result: ', result);
      }
    } catch (e) {
      console.log('Error: ', e);
    }
  }

  useEffect(async () => {
    try {
      let data = await window.contractMarket.get_sales({
        from_index: '0',
        limit: 10,
      });

      let mapItemData = data.map(async (item) => {
        let itemData = await window.contractNFT.nft_token({
          token_id: item.token_id,
        });

        return {
          ...item,
          itemData,
        };
      });

      let dataNew = await Promise.all(mapItemData);
      console.log('Data market: ', dataNew);
      setData(dataNew);
    } catch (e) {
      console.log(e);
    }
  }, []);

  function handleClickDetail(item) {
    // const [accountID, storageAccountId] = useState('Account');
    // const [id, setId] = useState('Token Id');
    // const [title, setTitle] = useState('Title');
    // const [description, setDescription] = useState('Description');
    // const [royalty, setRoyalty] = useState('Royalty rate');
    console.log(item);
    return alert(
      `Owner: ${item.owner_id}

Title: ${item.itemData.metadata.title}

description: ${item.itemData.metadata.description}

Media: ${item.itemData.metadata.media}

Token ID: ${item.token_id}
    
    
    `
    );
  }

  useEffect(async () => {
    if (window.accountId) {
      // Get token list
      let tokenList = [];
      let nearBalance = await window.account.getAccountBalance();
      let vbicBalance = await window.contractFT.ft_balance_of({
        account_id: window.accountId,
      });

      tokenList.push({
        isNative: true,
        symbol: 'NEAR',
        balance: nearBalance.available,
        decimals: 24,
        contractId: 'near',
      });

      tokenList.push({
        isNative: false,
        symbol: 'VBIC',
        balance: vbicBalance,
        decimals: 18,
        contractId: window.contractFT.contractId,
      });

      setTokenList(tokenList);
    }
  }, []);

  return (
    <div>
      <PageHeader className="site-page-header" title="Marketplace" />
      <Breadcrumb style={{ margin: '16px 45px' }}>
        <Button style={{ margin: '0 10px', borderRadius: '10px' }}>All</Button>
        <Button style={{ margin: '0 10px', borderRadius: '10px' }}>
          Sales
        </Button>
        <Button style={{ margin: '0 10px', borderRadius: '10px' }}>
          Aunctions
        </Button>
      </Breadcrumb>
      <Row
        style={{
          padding: 30,
          justifyContent: 'space-between',
        }}>
        {data.map((item) => {
          return (
            <Col>
              <Card
                onClick={() => handleClickDetail(item)}
                title={`@${item.owner_id}`}
                key={item.token_id}
                hoverable
                style={{
                  width: 300,
                  marginBottom: 30,
                  borderRadius: 15,
                  overflow: 'hidden',
                }}
                cover={
                  <img
                    style={{ height: 300, width: 300, objectFit: 'contain' }}
                    alt="Media NFT"
                    src={item.itemData.metadata.media}
                  />
                }
                actions={[
                  <Button
                    onClick={() => handleBuy(item)}
                    icon={<ShoppingCartOutlined />}>
                    Purchase
                  </Button>,
                ]}>
                <h1>
                  {item.sale_conditions.is_native
                    ? utils.format.formatNearAmount(
                        item.sale_conditions.amount
                      ) + ' Ⓝ'
                    : parseTokenWithDecimals(
                        item.sale_conditions.amount,
                        item.sale_conditions.decimals
                      ) + ' VBIC'}
                </h1>
                <Meta
                  title={item.itemData.metadata.title}
                  description={item.description}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

export default MarketPlace;
