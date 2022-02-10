import 'regenerator-runtime/runtime';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router';
import { login, logout } from './utils';
import Routes from './routes';
import './global.css';
import { Layout, Menu, Breadcrumb, Button, Dropdown } from 'antd';
import {
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
  TagsOutlined,
  DownCircleOutlined,
  MoneyCollectFilled,
} from '@ant-design/icons';
import 'antd/dist/antd.css';

const { Header, Content, Footer, Sider } = Layout;

import getConfig from './config';
import Search from 'antd/lib/transfer/search';
const { networkId } = getConfig(process.env.NODE_ENV || 'development');

import fav from './assets/favicon.ico';
export default function App() {
  const location = useLocation();
  const menu = (
    <Menu>
      <Menu.Item>
        <div onClick={logout}>Log Out</div>
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout>
      <Header
        style={{
          position: 'fixed',
          zIndex: 1,
          width: '100%',
          backgroundColor: '#fff',
        }}>
        <Menu
          mode="horizontal"
          style={{ justifyContent: 'space-evenly', display: 'flex' }}>
          <Menu.Item>
            <div style={{ display: 'flex' }}>
              <Link to={'/'}>𝓣𝓲𝓰𝓮𝓻 𝓝𝓕𝓣</Link>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div style={{ width: '1000' }}>
              <Search></Search>
            </div>
          </Menu.Item>

          <Menu.Item key="/" icon={<TagsOutlined />}>
            <Link to={'/'}> Marketplace </Link>
          </Menu.Item>

          <Menu.Item>
            {window.walletConnection.isSignedIn() ? (
              <Menu.Item key="/profile" icon={<UserOutlined />}>
                <Link to={'/profile'}> Your Profile </Link>
              </Menu.Item>
            ) : (
              ''
            )}
          </Menu.Item>

          <Menu.Item>
            {window.walletConnection.isSignedIn() ? (
              <Dropdown
                overlay={menu}
                placement="bottomLeft"
                arrow
                trigger={['click']}>
                <Button type="primary" shape="round" icon={<UserOutlined />}>
                  {window.accountId} <DownCircleOutlined />
                </Button>
              </Dropdown>
            ) : (
              <Button
                onClick={login}
                type="primary"
                shape="round"
                icon={<UserOutlined />}
                style={{ fontSize: '30' }}>
                Connect Wallet
              </Button>
            )}
          </Menu.Item>
        </Menu>
      </Header>
      <Content
        className="site-layout"
        style={{
          padding: '0 50px',
          marginTop: 64,
          backgroundColor: '#fff',
        }}>
        {/* <Breadcrumb style={{ margin: '16px 0' }}>
          <Button style={{ margin: '0 10px', borderRadius: '10px' }}>
            All
          </Button>
          <Button style={{ margin: '0 10px', borderRadius: '10px' }}>
            Sales
          </Button>
          <Button style={{ margin: '0 10px', borderRadius: '10px' }}>
            Aunctions
          </Button>
        </Breadcrumb> */}
        <div
          className="site-layout-background"
          style={{
            paddingBottom: 24,
            paddingTop: 24,
            minHeight: 360,
            // backgroundColor: '#fff',
          }}>
          <Routes />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}></Footer>
    </Layout>
  );
}
