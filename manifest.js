module.exports = {
  id: 'org.animedisk.addon',
  version: '1.0.0',
  name: 'Animedisk Anime',
  description: 'Stream anime from animedisk.me with TMDB metadata - Hindi dubbed and subbed anime',
  logo: 'https://animedisk.me/public/logo.png',
  resources: ['catalog', 'meta', 'stream'],
  types: ['series', 'movie'],
  idPrefixes: ['animedisk'],
  catalogs: [
    {
      type: 'series',
      id: 'animedisk-anime',
      name: 'Animedisk TV Series',
      extra: [
        {
          name: 'skip',
          isRequired: false
        }
      ]
    },
    {
      type: 'movie',
      id: 'animedisk-movies',
      name: 'Animedisk Movies',
      extra: [
        {
          name: 'skip',
          isRequired: false
        }
      ]
    },
    {
      type: 'series',
      id: 'animedisk-popular',
      name: 'Most Popular',
      extra: [
        {
          name: 'skip',
          isRequired: false
        }
      ]
    }
  ]
};
