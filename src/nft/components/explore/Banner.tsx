import { useLoadCollectionQuery } from 'graphql/data/nft/Collection'
import { useIsMobile } from 'nft/hooks'
import { fetchTrendingCollections } from 'nft/queries'
import { TimePeriod } from 'nft/types'
import { calculateCardIndex } from 'nft/utils'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components/macro'
import { opacify } from 'theme/utils'

import { Carousel, LoadingCarousel } from './Carousel'
import { CarouselCard, LoadingCarouselCard } from './CarouselCard'

const BannerContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 32px 16px 0 16px;
  position: relative;
`

// Safari has issues with blur / overflow
// https://stackoverflow.com/a/71353198
const fixBlurOnSafari = css`
  transform: translate3d(0, 0, 0);
`

const AbsoluteFill = styled.div`
  position: absolute;
  top: -96px;
  left: 0;
  right: 0;
  bottom: 0;
`

const BannerBackground = styled(AbsoluteFill)<{ backgroundImage: string }>`
  ${fixBlurOnSafari}

  background-image: ${(props) => `url(${props.backgroundImage})`};
  filter: blur(62px);
  opacity: ${({ theme }) => (theme.darkMode ? 0.3 : 0.2)};
  transform: scaleY(1.1);
`

const PlainBackground = styled(AbsoluteFill)`
  background: ${({ theme }) => `linear-gradient(${opacify(10, theme.userThemeColor)}, transparent)`};
`

const BannerMainArea = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  gap: 36px;
  max-width: 1200px;
  justify-content: space-between;
  z-index: 2;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    flex-direction: column;
    height: 100%;
    gap: 14px;
    margin-top: 4px;
    margin-bottom: 6px;
  }
`

const HeaderContainer = styled.div`
  display: flex;
  max-width: 500px;
  font-weight: 500;
  font-size: 72px;
  line-height: 88px;
  justify-content: start;
  align-items: start;
  align-self: center;
  flex-shrink: 0;
  padding-bottom: 32px;

  color: ${({ theme }) => theme.textPrimary};

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.lg}px`}) {
    font-size: 48px;
    line-height: 67px;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    font-size: 36px;
    line-height: 50px;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    font-size: 20px;
    line-height: 28px;
    justify-content: center;
    align-items: center;
    padding-top: 0px;
    padding-bottom: 0px;
  }
`

// Exclude collections that are not available in any of the following - OpenSea, X2Y2 and LooksRare:
const EXCLUDED_COLLECTIONS = ['0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb']
const TRENDING_COLLECTION_SIZE = 5

const Banner = () => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const { data } = useQuery(
    ['trendingCollections'],
    () => {
      return fetchTrendingCollections({
        volumeType: 'eth',
        timePeriod: TimePeriod.OneDay,
        size: TRENDING_COLLECTION_SIZE + EXCLUDED_COLLECTIONS.length,
      })
    },
    {
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  )

  const collections = useMemo(
    () => data?.filter((collection) => !EXCLUDED_COLLECTIONS.includes(collection.address)).slice(0, 5),
    [data]
  )

  // Trigger queries for the top trending collections, so that the data is immediately available if the user clicks through.
  const collectionAddresses = useMemo(() => collections?.map(({ address }) => address), [collections])
  useLoadCollectionQuery(collectionAddresses)

  const [activeCollectionIdx, setActiveCollectionIdx] = useState(0)
  const onToggleNextSlide = useCallback(
    (direction: number) => {
      if (!collections) return
      setActiveCollectionIdx((idx) => calculateCardIndex(idx + direction, collections.length))
    },
    [collections]
  )

  const activeCollection = collections?.[activeCollectionIdx]

  return (
    <BannerContainer>
      {activeCollection ? (
        activeCollection.bannerImageUrl ? (
          <BannerBackground backgroundImage={activeCollection.bannerImageUrl} />
        ) : (
          <PlainBackground />
        )
      ) : null}
      <BannerMainArea>
        <HeaderContainer>
          Better prices. {!isMobile && <br />}
          More listings.
        </HeaderContainer>
        {collections ? (
          <Carousel activeIndex={activeCollectionIdx} toggleNextSlide={onToggleNextSlide}>
            {collections.map((collection) => (
              <Suspense fallback={<LoadingCarouselCard collection={collection} />} key={collection.address}>
                <CarouselCard
                  key={collection.address}
                  collection={collection}
                  onClick={() => navigate(`/nfts/collection/${collection.address}`)}
                />
              </Suspense>
            ))}
          </Carousel>
        ) : (
          <LoadingCarousel>
            <LoadingCarouselCard />
          </LoadingCarousel>
        )}
      </BannerMainArea>
    </BannerContainer>
  )
}

export default Banner
