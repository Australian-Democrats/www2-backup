import{a as o}from"./virtual.BOcvvgUI.js";window.adCheckout=async e=>{const{data:a,error:r}=await o.checkout(e);return r?{ok:!1,error:r.message}:{ok:!0,redirect:a?.url}};
