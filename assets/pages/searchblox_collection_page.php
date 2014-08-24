<div class="wrap">
    <div class="searchblox-logo" > <h2 class="searchblox-h2">SearchBlox Search Plugin</h2></div>
        <table class="widefat" style="width: 650px;">
            <thead>
                <tr>
                        <th class="row-title">Configure your Search Collection</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <br/>
                        Please enter the custom search collection the plugin will use:
                         <div class="searchblox-clear"></div>
                        <form method="post" name = "collection_form">

                                <label>Collection name:</label>

                                    <?php wp_nonce_field('searchblox_nonce','searchblox_nonce_field'); ?>
                                        <input type="text" name="searchblox_collection" class = "regular-text code" 
                                           value="<?php echo searchblox_form_value( 'searchblox_collection' ) ;  ?>" />
                                        

                                <div class="searchblox-clear"></div>
                                <input type="submit" name="submit_collection" value="Save Collection"  class="button-primary"/>
                        </form>
                    </td>
                </tr>
            </tbody>
        </table>
    <br/>
 </div>