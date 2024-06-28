Conference = {
    generateAuthors(authors) {
        var newAuthorList = [];
        if (authors) {
            authors.forEach(author => {
                var full_name = author["text"]
                // split full name into first name and last name correctly including chinese names
                var firstName = full_name.split(" ").slice(0, -1).join(" ");
                var lastName = full_name.split(" ").slice(-1).join(" ");
                newAuthorList.push(
                    {
                        "firstName": firstName,
                        "lastName": lastName,
                        "creatorType": "author"
                    }
                )
            });
        }
        return newAuthorList;
    },

    generateDate(date) {
        if (!date) {
            return null;
        }
        if (date.length > 0) {
            return date[0].join("-");
        }
        else {
            return null;
        }
    },

    getMetaData(item) {
        var doi = item.getField('DOI');
        if (item.itemTypeID !== Zotero.ItemTypes.getID('ConferencePaper')) {
            // Utilities.publishError("Unsupported Item Type", "Only Conference Article is supported.")
            return null;
        }
        if (!doi) {
            // Utilities.publishError("DOI not found", "DOI is required to retrieve metadata.")
            return null;
        }

        var url = "https://dblp.org/search/publ/api?";
        const params = { q: "Momentum-Based Variance Reduction in Non-Convex SGD", format: "json" };
        console.log("start retrive:" + params["q"]);
        return Utilities.fetchWithTimeout(url + new URLSearchParams(params), {}, 3000)
            .then(response => {
                if (!response.ok) {
                    Utilities.publishError("Error retrieving metadata",
                        "Please check if DOI is correct and if you have network access to dx.doi.org.");
                    return null;

                }
                return response.text()
            })
            .then(data => {
                console.log("retrive success:" + data);
                try {
                    return JSON.parse(data)["result"]["hits"]["hit"][0]["info"];
                } catch (error) {
                    Utilities.publishError("Error parsing metadata", error);
                    return null;
                }
            })
            .then(dataJson => {
                console.log("retrive success:" + dataJson);
                var Title = Utilities.safeGetFromJson(dataJson, ["title"]);
                var Authors = this.generateAuthors(Utilities.safeGetFromJson(Utilities.safeGetFromJson(dataJson, ["authors"]), ["author"]));
                var Publication = Utilities.safeGetFromJson(dataJson, ["venue"]);
                var Pages = Utilities.safeGetFromJson(dataJson, ["pages"]);
                var Year = Utilities.safeGetFromJson(dataJson, ["year"]);
                var Link = Utilities.safeGetFromJson(dataJson, ["ee"]);
                return {
                    "Title": Title ? Title : "",
                    "Authors": Authors ? Authors : "",
                    "Publication": Publication ? Publication : "",
                    "Pages": Pages ? Pages : "",
                    "PublishDate": Year ? Year : "",
                    "Link": Link ? Link : ""
                };
            });
    },

    async updateMetadata(item) {
        var metaData = await this.getMetaData(item);
        console.log("metadata:" + metaData);
        if (!metaData) {
            return 1;
        }

        if (!Utilities.isEmpty(metaData["Title"])) item.setField('title', metaData["Title"]);
        if (!Utilities.isEmpty(metaData["Authors"])) item.setCreators(metaData["Authors"]);
        if (!Utilities.isEmpty(metaData["ConferenceName"])) item.setField('publicationTitle', metaData["Publication"]);
        if (!Utilities.isEmpty(metaData["Pages"])) item.setField('pages', metaData["Pages"]);
        if (!Utilities.isEmpty(metaData["PublishDate"])) item.setField('date', metaData["PublishDate"]);
        if (!Utilities.isEmpty(metaData["Url"])) item.setField('url', metaData["Link"]);
        await item.saveTx();
        return 0;
    }
}