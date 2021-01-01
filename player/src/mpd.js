import { baseUrl } from "./utils/base_url";


export function parseMpdManifest(data, url) {
    let xmlParser = new DOMParser(),
        xmlDoc = xmlParser.parseFromString(data, "text/xml"),
        mpdElement = xmlDoc.getElementsByTagName("MPD")[0],
        firstPeriodElement = mpdElement.getElementsByTagName("Period")[0];

    let streams = {};

    for (let adaptionSetElement of firstPeriodElement.getElementsByTagName("AdaptationSet")) {
        let firstRepresentationElement = adaptionSetElement.getElementsByTagName("Representation")[0],
            segmentTemplateElement = firstRepresentationElement.getElementsByTagName("SegmentTemplate")[0],
            segmentTimelineElement = segmentTemplateElement.getElementsByTagName("SegmentTimeline")[0],
            representationId = firstRepresentationElement.attributes.id.value;

        let segments = [];
        for(let sElement of segmentTimelineElement.getElementsByTagName("S")) {
            segments.push(new MpdManifestSegment(
                parseInt(sElement.attributes.t.value) / parseInt(segmentTemplateElement.attributes.timescale.value),
                parseInt(sElement.attributes.d.value) / parseInt(segmentTemplateElement.attributes.timescale.value),
                (
                    baseUrl(url) + "/" +
                    segmentTemplateElement.attributes.media.value
                        .replace("$RepresentationID$", representationId)
                        .replace("$Time$", sElement.attributes.t.value)
                )
            ));
        }

        streams[representationId] = new MpdManifestStream(
            firstRepresentationElement.attributes.mimeType.value,
            firstRepresentationElement.attributes.codecs.value,
            baseUrl(url) + "/" + segmentTemplateElement.attributes.initialization.value.replace("$RepresentationID$", representationId),
            segments
        );
    }

    return new MpdManifest(
        mpdElement.attributes.availabilityStartTime.value,
        mpdElement.attributes.publishTime.value,
        mpdElement.attributes.minimumUpdatePeriod.value,
        streams
    );
}


export class MpdManifest {
    constructor(
        availabilityStartTime,
        publishTime,
        minimumUpdatePeriod,
        streams
    ) {
        this.availabilityStartTime = availabilityStartTime;
        this.publishTime = publishTime;
        this.minimumUpdatePeriod = minimumUpdatePeriod;
        this.streams = streams;
    }
}


export class MpdManifestStream {
    constructor(
        mimeType,
        codecs,
        initSegmentUrl,
        segments
    ) {
        this.mimeType = mimeType;
        this.codecs = codecs;
        this.initSegmentUrl = initSegmentUrl;
        this.segments = segments;
    }
}


export class MpdManifestSegment {
    constructor(
        time,
        duration,
        url
    ) {
        this.time = time;
        this.duration = duration;
        this.url = url;
    }
}
