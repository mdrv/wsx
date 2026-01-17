/**
 * H: THROTTLE send action of CBORxWS messages by 250ms
 * 📝 Empty ping messages will be bypassed.
 */
import { type Constructor, type GConstructor } from '@mdrv/m/v254'
import { WS, WsWithAction, type Options } from '@mdrv/ws'
export { ensureBrowserId, ensureAudioFp } from '@mdrv/ws'
import { useEventListener } from 'runed'
import { on } from 'svelte/events'
import { __ } from '@mdrv/m/v254/log'

export class WsWithSvelte extends WS {
    ready: WS['CONNECTING'] | WS['OPEN'] | WS['CLOSING'] | WS['CLOSED'] = $state(WS.CLOSED)

    constructor(
        ...args: ConstructorParameters<typeof WS>
    ) {
        super(...args)
        this.addEventListener('open', () => {
            // __("OPEN")
            this.ready = WS.OPEN
        })
        this.addEventListener('close', () => {
            // __("CLOSE")
            this.ready = WS.CLOSED
        })
    }

    reconnect() {
        this.ready = WS.CONNECTING
        super.reconnect()
    }

    close() {
        // __("CLOSING")
        if (this.ready === WS.CLOSED) {
            return
        }
        this.ready = WS.CLOSING
        super.close()
    }

    listen(f: (msg: string) => void): () => void {
        return useEventListener(this, 'message', (e) => {
            f((e as MessageEvent).data.toString())
        })
    }
}

type WSA = ReturnType<ReturnType<ReturnType<typeof WsWithAction>>>
export const WsaWithSvelte = <All extends {
    Args: any
    ResultObject: {}
    ActionObject: {}
}>() => {
    return function <TBase extends WSA>(Base: TBase) {
        return class WSAS extends Base {
            ready: WS['CONNECTING'] | WS['OPEN'] | WS['CLOSING'] | WS['CLOSED'] = $state(WS.CLOSED)

            constructor(
                ...args: any[]
            ) {
                super(...args)
                this.addEventListener('open', () => {
                    // __("OPEN")
                    this.ready = WS.OPEN
                })
                this.addEventListener('close', () => {
                    // __("CLOSE")
                    this.ready = WS.CLOSED
                })
            }

            reconnect() {
                this.ready = WS.CONNECTING
                super.reconnect()
            }

            close() {
                // __("CLOSING")
                if (this.ready === WS.CLOSED) {
                    return
                }
                this.ready = WS.CLOSING
                super.close()
            }

            listen(f: (msg: All["ResultObject"]) => void): () => void {
                // l: https://github.com/svecosystem/runed/blob/main/packages/runed/src/lib/utilities/use-event-listener/use-event-listener.svelte.ts
                return on(this, 'message', (e) => {
                    f(this.getX(e as MessageEvent))
                })
                // return useEventListener(this, 'message', (e) => {
                //     f(this.getX(e as MessageEvent))
                // })
            }

        }
    }
}

export const WSAS = <All extends {
    Args: any
    ResultObject: {}
    ActionObject: {}
}>(eventKeys: (keyof All["Args"])[], ...args: [url: string, protocols?: string | string[], options?: Partial<Options>]) => {
    const tmp = WsWithAction(eventKeys)<All["Args"], All>()(WS)
    const tmp2 = WsaWithSvelte<All>()(tmp)
    return new tmp2(...args)
}

// export class WSAV<All extends {
//     Keys: string
//     ActionHandlers: { [K in string]: (args?: any) => void }
//     ResultObject: { x: string; y: boolean; z?: unknown }
//     ActionObject: { [K in string]: { x: K; args?: unknown } }
// }> extends WSA<All> {
//     ready: 0 | 1 | 2 | 3 = $state(3) // closed
//
//     constructor(
//         eventKeys: readonly All["Keys"][],
//         url: string,
//         protocols?: string | string[],
//         options: Partial<Options> = {},
//     ) {
//         super(eventKeys, url, protocols, options)
//         ensureBrowserID()
//
//         this.addEventListener('open', () => {
//             this.ready = this.OPEN
//         })
//         this.addEventListener('close', () => {
//             this.ready = this.CLOSED
//         })
//     }
//
//     // H: override
//     reconnect() {
//         this.ready = this.CONNECTING
//         super.reconnect()
//     }
//
//     // H: override
//     close() {
//         if (this.ready === this.CLOSED) {
//             return
//         }
//         this.ready = this.CLOSING
//         super.close()
//     }
//
//     listen(f: (msg: All["ResultObject"]) => void): () => void {
//         // l: https://github.com/svecosystem/runed/blob/main/packages/runed/src/lib/utilities/use-event-listener/use-event-listener.svelte.ts
//         return on(this, 'message', (e) => {
//             f(this.getX(e as MessageEvent))
//         })
//     }
// }
