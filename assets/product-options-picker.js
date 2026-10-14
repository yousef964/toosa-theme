if (!customElements.get('product-options')) {
class ProductOptionPicker extends HTMLElement{
    constructor(){
        super();
        
        // console.log("this", this)
        // this.form = this.parentElement.querySelector('.product-options-form');
        this.form = this.parentElement;
        this.select = this.form.querySelector('select');
        this.productOptions = this.querySelectorAll('ul');
        this.productOptionsList = this.querySelectorAll('li');

        this.productDropdowns = this.querySelectorAll('.product-option-picker__dropdown');

        this.product = {};
        this.chosenOptionsObject = {};
        this.selectOptionsListObject = [];


        this.prepareOptions(this.select);

        this.getProduct().then(res=> this.product = res);


        // Toggle Option dropdown
        for(let dropdown of this.productDropdowns){
            dropdown.addEventListener('click', (event) => {
                this.dropdown(dropdown, event);
            })

            document.addEventListener('click', (event) => {
                if (event.target !== dropdown && !dropdown.contains(event.target)) {
                    this.closeDropdown(dropdown)
                }
            })
        }

        for ( let list of this.productOptions ){
            this.chosenOptionsObject[list.dataset.optionName] = list.dataset.optionValue
        }


        // Option availability check
        // var checkVariantsStocks = [];
        // this.select.querySelectorAll('option').forEach(option => checkVariantsStocks.push(parseInt(option.dataset.inventoryQuantity)))
        
        // var checkVariantsStocksStatus = checkVariantsStocks.every(qty => qty !== 0);


        // If variant options present
        this.prepareSelectionListObject();
        var checkVariantsStocksStatus = this.selectOptionsListObject.every(option => ((option.available && option.stock != 0) || option.policy != 'deny'))
        
        if( !checkVariantsStocksStatus ){
            this.checkOptionsAvailability();
        }

        document.body.addEventListener('click', (event) => {
            var option = event.target.closest('.product-option-picker__list-item')
            if( option && !option.classList.contains('disabled') && !option.classList.contains('chosen') ){
                // assign chosen option for dropdown
                this.selectionPicker(option);

                // Option variant picker
                this.onClick(option);
                
                // Option availability on click
                var checkVariantsStocksStatus = this.selectOptionsListObject.every(option => ((option.available && option.stock != 0) || option.policy != 'deny'))
                if( !checkVariantsStocksStatus ){
                    this.checkOptionsAvailabilityOnClick(option);
                }
            }
        })
        
        for (let productOption of this.productOptionsList){
            productOption.addEventListener('focus', () => {
                productOption.addEventListener('keyup', (event) => {
                    if(event.key === 'Enter'){
                        productOption.click();
                    }
                })
            });
        }

    }

    getProduct = async () => {
        
        var handle = this.dataset.productHandle;

        return await fetch(`${window.Shopify.routes.root}products/${handle}.js`)
        .then((response) => {
            // console.log("res", response)
            if (!response.ok) {
                var error = new Error(response.status);
                throw error;
            }

            return response.json();
        })
        .catch((error) => {
            throw error;
        });
    }


    prepareOptions(select){

        var availableOptions = [];
        var selectOptionsList = [];

        for ( let list of this.productOptions ){
            availableOptions.push(list.dataset.optionName)
        }


        for (let selectOption of select) {
            
            // var selectOptionArray = selectOption.text.split(' ');
            // selectOptionsList.push(selectOptionArray.filter((string) => { 
            //     return string !== '/'
            // }))

            var matchFound = false;
            for (let productOption of this.productOptionsList){
              
              if( selectOption.innerText.trim() == productOption.dataset.optionValue ){
                matchFound = true;
              }
            }

            if( matchFound ){
              selectOptionsList.push([selectOption.text.trim()])
            }
            else{
              var selectOptionArray = selectOption.text.split(' / ');

              this.productOptions.forEach(productOptions => {
                productOptions.querySelectorAll('li').forEach(productOption => {
                  var productOptionValue = productOption.dataset.optionValue
                  if(productOptionValue.includes(' / ')){
                    if(selectOption.text.includes(productOption.dataset.optionValue)){
                      var newValue = productOption.dataset.optionValue.split(' / ');
                      var newSelectOption = selectOption.text.replace(productOption.dataset.optionValue, newValue.join(' $/ '));
                      selectOptionArray = newSelectOption.split(' / ');
                    }
                  }
                })
              })

              selectOptionsList.push(selectOptionArray.map((string) => { 
                //   var newString = string.replace('$/', '/')
                  var newString = string.replace(/\$\//gi, '/')
                  newString = newString.trim()
                  return newString
              }))
            }
            
        }

        

        for (let optionValueArray of selectOptionsList){
            var availableOptionsObject = {}

            availableOptions.map(function(optionName, i){
                availableOptionsObject[optionName] = optionValueArray[i];
            })
            // availableOptionsObject['price'] = optionValueArray[optionValueArray.length - 1];

            this.selectOptionsListObject.push( availableOptionsObject )
            
        }

    }

    onClick(option){

        this.productOptions = option.closest('product-options').querySelectorAll('ul') 

        this.chosenOptionsObject = {};
        this.selectOptionsListObject = [];
        this.productOptions.forEach(list => {
            for(let list_item of list.children){
                
                if( list_item.classList.contains('chosen') ){
                    var chosenOptionValue = list_item.dataset.optionValue
                    var chosenOptionName = list.dataset.optionName

                    this.chosenOptionsObject[chosenOptionName] = chosenOptionValue;
                }
            }
        })

        // .parentElement.querySelector('.product-options-form')
        this.select = option.closest('.product').querySelector('.product-options-form select');
        // this.selectOptionsListObject

        this.prepareOptions(this.select);
        this.prepareSelectionListObject();

        // console.log("select", this.select, "select options list", this.selectOptionsListObject, "chosen object", this.chosenOptionsObject)

        this.selectOptionsListObject.forEach((option) => {

            const newOption = Object.assign({}, option)
            delete newOption.available
            delete newOption.stock
            delete newOption.management
            delete newOption.index
            delete newOption.policy

            
            if( JSON.stringify(newOption) === JSON.stringify(this.chosenOptionsObject) ){
                
                if( typeof option.index != 'undefined' ){
                    this.select.selectedIndex = option.index;
                    this.select.dispatchEvent(new Event('change'));

                    // console.log("select data", this.select[index])

                    var variantId = this.select[option.index].getAttribute('value');

                    // console.log("valie", variantId);

                    var newUrl = new URL(window.location.href);
                    
                    if( newUrl.searchParams.get('variant') !== null ){
                        newUrl.searchParams.set('variant', variantId)
                    }
                    else{
                        newUrl.searchParams.append('variant', variantId);
                    }
                                        
                    if( Object.keys(this.product).length ){
                        // console.log( "product", this.dataset.productHandle, this.product );
                        for (let variant of this.product.variants){
                            if( variant.id == variantId ){
                                // console.log("variant", variant);
                            }
                        }
                    }

                    if(!Shopify.designMode){
                        history.pushState({}, null, newUrl);
                    }
                }
                else{
                    this.select.selectedIndex = 0;
                    this.select.dispatchEvent(new Event('change'));
                }
            }
        })


    }

    selectionPicker(option){
        var currentDropdown = option.parentElement //event.target.parentElement;
        var currentDropdownListItems = currentDropdown.querySelectorAll('li');
        var chosenElements = currentDropdown.parentElement.parentElement.querySelectorAll('.product-option-picker-chosen > span, .product-option-picker-label > .product-option-picker-label--chosen');
        var chosenSwatchElement = currentDropdown.parentElement.parentElement.querySelector('.product-option-picker-chosen > .product-option-swatch')
        var chosenOptionSwatch = option.querySelector('.product-option-swatch');
        // console.log("chosen", chosenElements)
        
        for(let item of currentDropdownListItems){
            item.classList.remove('chosen');
        }
        option.classList.add('chosen');

        for(let chosen of chosenElements){
            chosen.innerText = option.textContent.trim()//event.target.innerText
        }
        
        if( chosenOptionSwatch ){
            console.log("contains children", chosenOptionSwatch.children);
            var optionProductSwatchStyles = getComputedStyle(chosenOptionSwatch)
            var optionSwatchColor = optionProductSwatchStyles.getPropertyValue('--product-swatch-value');
            if( optionSwatchColor.length == 0 ){
                optionSwatchColor = option.dataset.optionValue
            }
            if( chosenSwatchElement ){
                chosenSwatchElement.innerHTML = chosenOptionSwatch.innerHTML;
                chosenSwatchElement.style.setProperty('--product-swatch-value', optionSwatchColor);
            }
        }
    }

    
    prepareSelectionListObject(){

        var newSelectOptions = this.selectOptionsListObject.map(obj => Object.assign({}, obj))

        this.select.querySelectorAll('option').forEach((option, index) => {
            newSelectOptions[index].stock = parseInt(option.dataset.inventoryQuantity);
            newSelectOptions[index].management = option.dataset.inventoryManagement;
            newSelectOptions[index].policy = option.dataset.inventoryPolicy;
        })
        
        // console.log("select options", newSelectOptions, this.chosenOptionsObject);

        var customSelectOptions = [];
        Object.entries(this.chosenOptionsObject).forEach(chosenOption => {
            var eachOptions = [];
            this.productOptions.forEach((productOption, index) => {
                if( chosenOption[0] == productOption.dataset.optionName ){
                    for(let option of productOption.children){
                        eachOptions.push({ [productOption.dataset.optionName]: option.dataset.optionValue});
                    }
                }
            })
            customSelectOptions.push(eachOptions);

        })
        // console.log("custom select options", customSelectOptions);
        
        
        const generateCombinations = (data) => {
            const result = [];
            const resultTrimmed = []
            function helper(temp, index) {
              if (temp.length === data.length) {
                result.push(temp);
                return;
              }
              for (let i = 0; i < data[index].length; i++) {
                helper([...temp, data[index][i]], index + 1);
              }
            }
            helper([], 0);

            result.forEach(data => {
                const obj = data.reduce((result, item) => {
                    return { ...result, ...item };
                  }, {});
                  resultTrimmed.push(obj)
              })
            return resultTrimmed;
        }

        let newcustomSelectOptions = generateCombinations([...customSelectOptions]);

        let availableKeys = Object.keys(newcustomSelectOptions[0]);
        
        const finalSelectOptions = newcustomSelectOptions.map((selectOption) => {
            let newSelectOption = Object.assign({}, selectOption);
            newSelectOptions.forEach((option, index) => {
                if( availableKeys.every(key => {
                    return option[key] == selectOption[key]
                }) ){
                    selectOption.available = true
                    newSelectOption = {...selectOption, ...option, index}
                }
                else{
                    if( !selectOption.hasOwnProperty('available') ){
                        selectOption.available = false
                        newSelectOption = selectOption
                    }
                }
            })

            return newSelectOption
        })

        // console.log("final select options", finalSelectOptions)
        this.selectOptionsListObject = finalSelectOptions;


    }

    checkOptionsAvailability(){
        for(let productOption of this.productOptionsList){
            productOption.classList.remove('disabled');
            productOption.classList.remove('unavailable');
            
        }
        

        // console.log("select options", this.selectOptionsListObject);
        var newSelectOptions = this.selectOptionsListObject.map(obj => Object.assign({}, obj))

        var productOptionsArray = {};

        this.productOptions.forEach(productOption => {
            productOptionsArray[productOption.dataset.optionName] = Array.from(productOption.children).map(option => option.dataset.optionValue)
        })
        // console.log("product options", this.productOptions);

        if( Object.keys(productOptionsArray).length == 1 ){
            newSelectOptions.forEach(option => {
                if((option.stock == 0 && option.management != '' && option.policy != 'continue') || !option.available){
                    this.productOptions.forEach(productOption => {
                        for(let optionValue of productOption.children){
                            if(option[productOption.dataset.optionName] == optionValue.dataset.optionValue){
                                optionValue.classList.add('disabled');
                            }
                        }
                    })
                }
            })
        }

        // console.log("this.productOptions", this.productOptions, "newSelectOptions", newSelectOptions, "this.chosenOptionsObject", this.chosenOptionsObject);

        this.productOptions.forEach(productOption => {

            let filterdSelectOptions = newSelectOptions.filter(option => {
                return option[productOption.dataset.optionName] != this.chosenOptionsObject[productOption.dataset.optionName] 
            })


            for(let optionValue of productOption.children){
                if( optionValue.dataset.optionValue !== this.chosenOptionsObject[productOption.dataset.optionName] ){
                    if(filterdSelectOptions.every(option => {
                        return (option.stock == 0 && option.management != '' && option.policy != 'continue') || !option.available
                    })){
                        
                        optionValue.classList.add('disabled');
                    }
                    else{
                        var chosenOptionsObject = Object.assign({}, this.chosenOptionsObject);
                        delete chosenOptionsObject[productOption.dataset.optionName]
                        
                        // console.log("filterdSelectOptions", filterdSelectOptions, "optionValue", optionValue)

                        filterdSelectOptions.forEach((option) => {
                            
                            var chosenSelectOptions = Object.entries(chosenOptionsObject).map(chosenOption => {
                                return option[chosenOption[0]] == chosenOption[1]
                            })

                            if(chosenSelectOptions.every(option => option)){

                                if((option.stock == 0 && option.management != '' && option.policy != 'continue') || !option.available){
                                    if( option[productOption.dataset.optionName] == optionValue.dataset.optionValue ){
                                        optionValue.classList.add('disabled');

                                    }
                                }
                            }
                        })
                        
                        filterdSelectOptions.forEach((option) => {

                            if( option.available && (option.stock != 0 || option.management == '' || option.policy == 'continue') ){
                                
                                if( option[productOption.dataset.optionName] == optionValue.dataset.optionValue ){
                                    if( optionValue.classList.contains('disabled') ){
                                        optionValue.classList.add('unavailable');
                                        optionValue.classList.remove('disabled');
                                    }
                                }
                            }
                            
                        })
                    }
                }
            }
            
        });

    }

    checkOptionsAvailabilityOnClick(option){

        var productOptionsList = option.closest('product-options').querySelectorAll('li')//this.productOptionsList;

        for(let productOption of productOptionsList){
            productOption.classList.remove('disabled');
            productOption.classList.remove('unavailable');
        }
        // console.log("productOptionsList", productOptionsList)
        
        var newSelectOptions = this.selectOptionsListObject.map(obj => Object.assign({}, obj))

        var productOptionsArray = {};
        
        this.productOptions.forEach(productOption => {
            productOptionsArray[productOption.dataset.optionName] = Array.from(productOption.children).map(option => option.dataset.optionValue)
        })

        this.productOptions.forEach(productOption => {

            // let filterdSelectOptions = newSelectOptions.filter(option => {
            //     return option[productOption.dataset.optionName] != this.chosenOptionsObject[productOption.dataset.optionName] 
            // })

            let filterdSelectOptions = newSelectOptions;
            

            for(let optionValue of productOption.children){
                // if( optionValue.dataset.optionValue !== this.chosenOptionsObject[productOption.dataset.optionName] ){
                    if(filterdSelectOptions.every(option => { return (option.stock == 0 && option.management != '' && option.policy != 'continue') || !option.available } )){
                        optionValue.classList.add('disabled');
                    }
                    else{
                        var chosenOptionsObject = Object.assign({}, this.chosenOptionsObject);
                        delete chosenOptionsObject[productOption.dataset.optionName]
                        
                        filterdSelectOptions.forEach((option) => {
                            
                            var chosenSelectOptions = Object.entries(chosenOptionsObject).map(chosenOption => {
                                return option[chosenOption[0]] == chosenOption[1]
                            })
                            

                            if(chosenSelectOptions.every(option => option)){
                                
                                if((option.stock == 0 && option.management != '' && option.policy != 'continue') || !option.available){
                                // if(!option.available){
                                    if( option[productOption.dataset.optionName] == optionValue.dataset.optionValue ){
                                        optionValue.classList.add('disabled');

                                    }
                                }
                            }
                        })


                        filterdSelectOptions.forEach((option) => {

                            if( option.available && ( option.stock != 0 || option.management == '' || option.policy == 'continue') ){
                                
                                if( option[productOption.dataset.optionName] == optionValue.dataset.optionValue ){
                                    if( optionValue.classList.contains('disabled') ){
                                        optionValue.classList.add('unavailable');
                                        optionValue.classList.remove('disabled');
                                    }
                                }
                            }
                            
                        })
                    }
                // }
            }
            
        });
    }


    dropdown(dropdown, event){
        // console.log("dropdown", dropdown)
        // if( !dropdown.contains(document.activeElement) ){
            if( dropdown.classList.contains('active') ){
                this.closeDropdown(dropdown)
                dropdown.blur();
            }
            else{
                if( !dropdown.matches(':focus-within:not(:focus)') ){
                    this.openDropdown(dropdown)
                }
            }
        // }
        
        // dropdown.classList.contains('active') ? this.closeDropdown(dropdown) : this.openDropdown(dropdown);
        // console.log("active element", dropdown.matches(':focus-within:not(:focus)'))
    }

    openDropdown(dropdown){
        dropdown.classList.add('active')
    }
    closeDropdown(dropdown){
        dropdown.classList.remove('active')
    }

}


customElements.define( 'product-options', ProductOptionPicker )
}