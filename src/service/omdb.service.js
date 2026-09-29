const OMDB_API_URL = 'https://www.omdbapi.com/';

async function searchMovie(title, year) {
    try {
        const params = new URLSearchParams({
            apikey: process.env.OMDB_API_KEY,
            t: title
        });

        if (year) {
            params.append('y', year);
        }

        const response = await fetch(
            `${OMDB_API_URL}?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(
                `OMDb request failed with status ${response.status}`
            );
        }

        const data = await response.json();

        if (data.Response === 'False') {
            return null;
        }

        return {
            imdbId: data.imdbID,
            title: data.Title,
            year: data.Year,
            poster: data.Poster,
            genre: data.Genre,
            director: data.Director,
            runtime: data.Runtime
        };

    } catch (error) {
        console.error('OMDb service error:', error);
        throw error;
    }
}

module.exports = { searchMovie };