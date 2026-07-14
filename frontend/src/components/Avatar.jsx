import React from 'react';
import { initials } from '../utils/helpers';

export default function Avatar({ name, color = '#5b5fef', size = 36 }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
