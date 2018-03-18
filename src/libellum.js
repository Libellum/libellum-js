var Libellum = function () {
    /**
     * auxiliary variables
     */
    var is_disconecting = false;
    var $this = this;
    /**
     *  The variable bellow is used to cache de callback functions
     */
    var connect_callback = null;
    var onerror_callback = null;
    var sign_callback = null;
    var request_certificate_callback = null;

    /**
     * WebSocket Connection
     */
    var connection = null;

    this.connect = function (callback=null) {
        if(this.is_connected()) this.notify({ "error": "Already connected!" });

        connect_callback = callback;

        //protocol compatible = "RFC6455"
        connection = new WebSocket("ws://localhost:9002");
        connection.onopen = function (event) {
            is_disconecting = false;
            if(connect_callback != null)
                connect_callback(event);
        };
        connection.onerror = function (event) {
            $this.notify(event);
        };
        connection.onclose = function (p1) {
            if(!is_disconecting){
                $this.notify( {
                    "error": "The Server have disconected with no reason!",
                    "data": p1
                } );
            }
        };
        connection.onmessage = this.onmessage;
    };

    this.notify = function (message) {
        if(onerror_callback != null){
            onerror_callback(message);
        }else{
            throw JSON.stringify(message);
        }
    };

    this.onmessage = function (event) {
        var data = JSON.parse(event.data);

        if(!data.action){
            if(request_certificate_callback != null){
                request_certificate_callback(data);
                request_certificate_callback = null;
            }else{
                $this.notify( {
                    "error": "Event not handled: \"certificate request\"",
                    "data": data
                } );
            }
        }else if(data.action === "signedText"){
            sign_callback(data);
            sign_callback = null;
        }else if(data.action === "error") {
            $this.notify( data );
        }
    };

    this.is_connected = function () {
        if(connection == null){
            return false;
        }else if(connection.readyState === connection.OPEN){
            return true;
        }
        return false;
    };

    /**
     * callback variable is a function that when is call receiving a json as parameter
     * @param callback
     */
    this.request_certificate = function(callback){
        if(!this.is_connected()) this.notify({ "error": "Not connected!" });

        request_certificate_callback = callback;
        connection.send(JSON.stringify({
            "action":"listCerts"
        }));
    };

    /**
     * data is a string that going to be signed
     * cert_id is a int that is the id of the certificate thats going to be used
     * callback variable is a function that when is call receiving a json as parameter
     * @param data
     * @param cert_id
     * @param callback
     */
    this.sign = function (data, cert_id, callback) {
        if(!this.is_connected()) this.notify({ "error": "Not connected!" });

        if(Number.isInteger(cert_id)){
            if((typeof data) === "string") {
                if((typeof callback) === "function") {
                    sign_callback = callback;
                    connection.send(JSON.stringify({
                        "action": "signText",
                        "text": data,
                        "certId": cert_id
                    }));
                }else{
                    this.notify( {
                        "error": "callback is not a function",
                        "data": callback
                    } );
                }
            }else{
                this.notify( {
                    "error": "data is not a string",
                    "data": data
                } );
            }
        }else{
            this.notify( {
                "error": "cert_id is not a interger",
                "data": cert_id
            } );
        }
    };

    /**
     * callback variable is a function that when is call receiving a json as parameter
     * @param callback
     */
    this.onerror = function (callback) {
        onerror_callback = callback;
    };

    /**
     * Close connection to the client
     */
    this.disconnect = function(){
        if(!this.is_connected()) this.notify({ "error": "Not connected!" });

        is_disconecting = true;
        connection.disconnect();
    };

};

module.exports = Libellum;