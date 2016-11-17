# PathwayViewer

The html is fairly basic and has a script at the bottom that creates a KeggPathway object.  
When loading the html from the web browser it requires a kegg pathway id query like
```
<path to file>pathway.html?id=hsa04512
```
To make the code work for you there are a few things that would need to be changed.  
On [line 1012](js/kegg-pathway2.js#L1012-L1055) thise is where the raw data is downloaded from. [downloadFile function Line 36](js/kegg-pathway2.js#L36-L44) would need to be changed to download from the correct rest api. 
Each of the following lines of code use the downloadFile function to get a file that is required to display the map properly:
* [Line 1015](js/kegg-pathway2.js#L1015) for matrix.csv
* [Line 964](js/kegg-pathway2.js#L964) for dendro_row.json
* [Line 969](js/kegg-pathway2.js#L969) for background.csv
* [Line 1186](js/kegg-pathway2.js#L1186) for metadata.tsv

####matrix.csv
This is  a matrix of normalized enrichment values with sample ids in the first row and gene ids in the first column. 

####metadata.tsv
This file is a tab dilimited table with meta information about samples with sample ids in the first column and meta info ids in the first row. [More information about metatdata files](https://github.com/ActiveDataBio/adbio_tutorial/blob/master/tutorial_2_metadata.ipynb)

####dendro_row.json
This file is a heirachical structure of the genes in a json format

####background.csv
this file contains a table to map the ids on the matrix to the ids in the kegg pathway

###More information
[More information about matrix.csv, dendro_row.json](https://github.com/ActiveDataBio/adbio_tutorial/blob/master/tutorial_1_generate_rdata.ipynb)  
[More information about metatdata files](https://github.com/ActiveDataBio/adbio_tutorial/blob/master/tutorial_2_metadata.ipynb)  
[More information about background.csv](https://github.com/ActiveDataBio/adbio_tutorial/blob/master/background.md)  
