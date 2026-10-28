export default function isBlobLink (link: string) {
    try{
        if (link.slice(0, 56) === 'https://n4mbcrosj0yqsqe6.private.blob.vercel-storage.com'){
            
            return true;
        }
    }
    catch{
        if (JSON.parse(link).url.slice(0, 56) === 'https://n4mbcrosj0yqsqe6.private.blob.vercel-storage.com'){
            return true;
        }

    }
    return false;
} 