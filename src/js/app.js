 
App = {
    web3Provider: null,
    contracts: {},
    account: "0x0",
    loading: false,
    tokenPrice: 1000000000000000,
    tokensSold: 0,
    tokensAvailable: 750000,

    init: () => {
        console.log('App initialized...')
        return App.initWeb3();
    },
    initWeb3: () =>{
        if (typeof web3 !== 'undefined') {
            // If a web3 instance is already provided by Meta Mask.
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
          } else {
            // Specify default instance if no web3 instance provided
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
            web3 = new Web3(App.web3Provider);
      }
      return App.initContracts();
    },
    initContracts: () => {
      $.getJSON("ERC20TokenSale.json", (ERC20TokenSale) =>{
        App.contracts.ERC20TokenSale = TruffleContract(ERC20TokenSale);
        App.contracts.ERC20TokenSale.setProvider(App.web3Provider);
        App.contracts.ERC20TokenSale.deployed().then((ERC20TokenSale) =>{
          console.log("ERC20 Token Sale Address:", ERC20TokenSale.address);
        });
      }).done(()=>{
          $.getJSON("ERC20Token.json", (ERC20Token) =>{
            App.contracts.ERC20Token = TruffleContract(ERC20Token);
            App.contracts.ERC20Token.setProvider(App.web3Provider);
            App.contracts.ERC20Token.deployed().then(function(ERC20Token){
              console.log("ERC20 Sale Address:", ERC20Token.address);
            });  
            App.listenForEvents();
            return App.render();

        });
      })
    },
    //Listen for events emitted from the contract
    listenForEvents: ()=>{
      App.contracts.ERC20TokenSale.deployed().then((instance)=>{
        instance.Sell({}, {
          fromBlock: 0,
          toBlock: 'latest',
        }).watch((error,event)=>{
          console.log("event triggered", event);
          App.render();
        })
      })
    },

    render: () => {
      if (App.loading){
        return;
      }
      App.loading = true;
      
      var loader = $('#loader');
      var content = $("#content");

      loader.show();
      content.hide();

      //Load account data
      web3.eth.getCoinbase( (err, account) => {
        if (err === null ) {
          console.log("account", account);
          App.account = account;
          $("#accountAddress").html("You Account: " + account);

        }
      })
      //Load token sale contract
      App.contracts.ERC20TokenSale.deployed().then(function(instance) {
        ERC20TokenSaleInstance = instance;
        return ERC20TokenSaleInstance.tokenPrice();
      }).then((tokenPrice) =>{
        console.log("tokenPrice " + tokenPrice.toNumber());
        App.tokenPrice = tokenPrice;
        $(".token-price").html(web3.fromWei(App.tokenPrice, "ether").toNumber());
        return ERC20TokenSaleInstance.tokensSold();
      }).then((tokensSold)=> {
        App.tokensSold = tokensSold.toNumber();
        $(".tokens-sold").html(App.tokensSold);
        $(".tokens-available").html(App.tokensAvailable);

        let  progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
        console.log(progressPercent);
        $("#progress").css("width", progressPercent + '%');
        //Load token contract
        App.contracts.ERC20Token.deployed().then((instance)=>{
          ERC20TokenSaleInstance = instance;
          return ERC20TokenSaleInstance.balanceOf(App.account);
        }).then((balance)=> {
          $('.dapp-balance').html(balance.toNumber());

            App.loading = false;
            loader.hide();
            content.show();

        })
      });
      

    },
    buyTokens: () => {
      $("#content").hide();
      $("loader").show();
      let numberOfTokens = $("#numberOfTokens").val();
      App.contracts.ERC20TokenSale.deployed().then((instance)=>{
        return instance.buyTokens(numberOfTokens, {
          from: App.account,
          value: numberOfTokens * App.tokenPrice,
          gas: 500000
        });
      }).then((result)=> {
        console.log("Tokens bought...");
        $("form").trigger("reset"); //reset number of tokens in form
        //Wait for Sell event
      });
    }
  }

$(function(){
    $(window).load(function(){
        App.init();
    })
});