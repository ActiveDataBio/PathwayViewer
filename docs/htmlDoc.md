The html is fairly basic and has a script at the bottom that creates a KeggPathway object. 

The keggPathway object is implemented in kegg-pathway2.js.
[line 692](../js/kegg-pathway2.js#L692-L932) is where it downloads the kgml file that is associated with the pathway id.
[line 759](../js/kegg-pathway2.js#L759-L916) is where is starts to draw the rectangles on the map.
[line 1012](../js/kegg-pathway2.js#L1012-L1055) is where the raw data is downloaded from.
[line 1081](../js/kegg-pathway2.js#L1081-L1122) is where the pathway genes are downloaded from adbio rest.
[line 1238](../js/kegg-pathway2.js#L1238-L1387) is where the highlighting of proteins happens.
