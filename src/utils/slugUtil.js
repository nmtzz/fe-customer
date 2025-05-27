import slugify from "slugify";

const getSlug = (str) => {
    return slugify(str, {
        replacement: '-',
        lower: true
    });
};

export default getSlug
