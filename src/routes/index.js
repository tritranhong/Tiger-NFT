import React from 'react';
import { Routes, Route, Switch } from 'react-router-dom';

import MarketPlace from '../pages/MarketPlace';
import Profile from '../pages/Profile';
import Detail from '../pages/Detail';

function Router() {
  return (
    <Routes>
      <Route path="/" element={<MarketPlace />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default Router;
