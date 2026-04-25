const React = require('react');
const { View } = require('react-native');

module.exports = {
  FlashList: ({ data, renderItem, ...props }) => {
    return React.createElement(
      View,
      props,
      data?.map((item, index) =>
        renderItem ? renderItem({ item, index }) : null
      )
    );
  },
};
