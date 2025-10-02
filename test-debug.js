console.log('Test URL:', window.location.search);
const params = new URLSearchParams(window.location.search);
console.log('mpn param:', params.get('mpn'));
console.log('src param:', params.get('src'));
