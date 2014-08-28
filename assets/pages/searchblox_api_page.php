<div class="wrap">
	<div class="searchblox-logo" > <h2 class="searchblox-h2">SearchBlox Search Plugin</h2></div>

    <table class="widefat" style="width: 650px;">
        <thead>
                <tr>
                        <th class="row-title">Authorize the SearchBlox Search Plugin</th>
                </tr>
        </thead>
        <tbody>
        <tr>
            <td>
            Thanks for installing the Search Blox Search Plugin for Wordpress. Please enter your Search Blox API key in the field below and click 'Authorize' to get started. 
            <div class="searchblox-clear"></div>

               <label>SearchBlox API Key:</label>
                <form method="post" name = "api_form">
                        <?php wp_nonce_field('searchblox_nonce','searchblox_nonce_field'); ?>
                <input type="text" name="sb_form[apikey]" 
				value="<?php echo searchblox_form_value( 'apikey' , 'true' ) ; 
					   // True as the name is an array
					   ?>"   
					   class="regular-text code" />
					   
                <div class="searchblox-clear"></div>
                <label>SearchBlox Server Name:</label> 
                <br />
                <input type="text" name="sb_form[location]" 
				value="<?php echo searchblox_form_value( 'location' , 'true' ) ; 
                        // True as the name is an array
					   ?>"    
		            class="regular-text code" />
					
				<div class="searchblox-clear"></div>
                <label>SearchBlox Port # :</label> 
                <br />
                <input type="text" name="sb_form[port_no]" 
				value="<?php echo searchblox_form_value( 'port_no' , 'true' ) ;  
                           // True as the name is an array
					   ?>"  
		            class="regular-text code" />	
				<span class="description">e.g. 8080</span>
				
                <input type="hidden" name="action" value="update" />
                <input type="hidden" name="page_options" value="searchblox_location, searchblox_collection, searchblox_apikey" />
                <div class="searchblox-clear"></div>
                <input type="submit" name="submit_api" value="Authorize" class="button-primary" />
                </form>
                            
            </td>
        </tr>
        </tbody>
    </table>
</div>