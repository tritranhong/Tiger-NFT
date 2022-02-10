import React from 'react';
import { Card, Button } from 'antd';
import ModalMintNFT from '../components/ModelMintNFT';
import ModalSale from '../components/ModalSale';
import ModalTransferNFT from '../components/ModalTransferNFT';
const { Meta } = Card;
const nearConfig = getConfig(process.env.NODE_ENV || 'development');

function ModalCard() {
  return (
    <Card
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
          alt="nft-cover"
          src={item.metadata.media}
        />
      }
      actions={[
        <Button
          style={{ minWidth: 80 }}
          onClick={() => handleTransferToken(item)}
          key={'send'}>
          Transfer
        </Button>,
        <Button
          style={{ minWidth: 80 }}
          onClick={() => handleSaleToken(item)}
          key={'sell'}>
          Sell
        </Button>,
        <Button
          style={{ minWidth: 80 }}
          onClick={() => handleSaleToken(item)}
          key={'sell'}>
          Auction
        </Button>,
      ]}>
      <Meta
        title={`${item.metadata.title} (${
          item.approved_account_ids[nearConfig.marketContractName] >= 0
            ? 'SALE'
            : 'NOT SALE'
        })`}
        description={`
                    ${item.metadata.description}
                  `}
      />
    </Card>
  );
}

export default ModalCard;
